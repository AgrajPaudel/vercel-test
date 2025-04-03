// backend-api.js - API route handler for LoRA processing
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Utility to extract files from tar
async function extract(tarData: Buffer) {
  const extractedFiles = {};
  // Basic TAR file parsing - TAR files have 512-byte blocks
  let position = 0;
  while(position + 512 <= tarData.length) {
    // Read header block
    const header = tarData.slice(position, position + 512);
    position += 512;
    // Check for end of archive (empty block)
    if (header.every((byte) => byte === 0)) {
      break;
    }
    // Extract filename (first 100 bytes of header)
    const filenameBytes = header.slice(0, 100);
    let filename = '';
    for(let i = 0; i < filenameBytes.length && filenameBytes[i] !== 0; i++) {
      filename += String.fromCharCode(filenameBytes[i]);
    }
    // Extract file size (bytes 124-136)
    const fileSizeBytes = header.slice(124, 136);
    const fileSizeOctal = new TextDecoder().decode(fileSizeBytes).trim();
    const fileSize = parseInt(fileSizeOctal, 8);
    if (fileSize > 0) {
      // Read file content
      const fileContent = tarData.slice(position, position + fileSize);
      const extractedFiles: Record<string, string> = {}; // If values are expected to be strings
      // Move position
      position += fileSize;
      // Align to 512-byte boundary
      const remainder = fileSize % 512;
      if (remainder > 0) {
        position += 512 - remainder;
      }
    }
  }
  return extractedFiles;
}

// Initialize Supabase client
const supabaseUrl:string = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey :string= process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  try {
    // Verify API Secret
    const apiSecretHeader = req.headers.get('X-API-Secret');
    if (apiSecretHeader !== process.env.API_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { record } = await req.json();
    const { id, user_id, lora_name, training_params, input_files } = record;
    const trigger_word = lora_name;

    console.log(`Starting backend processing for LoRA: ${trigger_word}`);

    // Get input file path
    let input_file;
    let input_zip_url;
    
    if (typeof input_files === 'string') {
      try {
        input_file = JSON.parse(input_files);
      } catch (e) {
        throw new Error("Invalid input_files format");
      }
    }
    
    const { data: zipFile, error: zipError } = await supabase
  .storage
  .from("input-lora")
  .download(input_file.zip_file);

if (zipError) {
  throw new Error(`Failed to download zip file: ${zipError.message}`);
}

// Convert the zip file (Blob) into an ArrayBuffer
const zipBuffer = await zipFile.arrayBuffer();


    // Ensure training_params is an object
    let params = training_params;
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params);
      } catch (e) {
        throw new Error("Invalid training_params format");
      }
    }

    // Generate output file path
    const output_bucket = "output-lora";
    const output_path = `${user_id}/${trigger_word}.safetensors`;
    
    console.log(`Starting training for ${trigger_word}...`);
    console.log(`Parameters: ${JSON.stringify(params)}`);
    
    // Create new Replicate model
    const replicateUsername = process.env.REPLICATE_USERNAME;
    const modelName = process.env.MODEL_NAME || "api_train_lora"; 
    
    console.log(`Creating Replicate model: ${replicateUsername}/${modelName}`);
    
    const createModelResponse = await fetch("https://api.replicate.com/v1/models", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        owner: replicateUsername,
        name: modelName,
        visibility: "public",
        hardware: "gpu-a100-large"
      })
    });
    
    const createModelData = await createModelResponse.json();
    if (!createModelResponse.ok) {
      throw new Error(`Model creation failed: ${JSON.stringify(createModelData)}`);
    }
    
    const trainingDestination = `${replicateUsername}/${modelName}`;
    
    // Start Replicate Training
    const replicateResponse = await fetch("https://api.replicate.com/v1/trainings", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        destination: trainingDestination,
        version: "ostris/flux-dev-lora-trainer:b6af14222e6bd9be257cbc1ea4afda3cd0503e1133083b9d1de0364d8568e6ef",
        input: {
          steps: params.steps,
          lora_rank: params.loraRank,
          optimizer: params.optimizer,
          batch_size: params.batchSize,
          learning_rate: params.learningRate,
          input_images: zipBuffer,
          trigger_word: trigger_word,
          autocaption: true,
          caption_dropout_rate: 0.05,
          gradient_checkpointing: false,
          resolution: "512,768,1024"
        }
      })
    });
    
    const replicateData = await replicateResponse.json();
    console.log("Replicate response:", JSON.stringify(replicateData));
    
    if (!replicateData?.urls?.get) {
      throw new Error("Replicate training failed to start: " + JSON.stringify(replicateData));
    }
    
    const training_url = replicateData.urls.get;
    
    // Poll Replicate API until training is complete
    let replicate_status = "training";
    let checkData;
    
    while(!["succeeded", "failed", "cancelled"].includes(replicate_status)) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Check every 10 seconds
      
      const checkResponse = await fetch(training_url, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_KEY}`
        }
      });
      
      checkData = await checkResponse.json();
      replicate_status = checkData.status;
      console.log(`Training status: ${replicate_status}`);
    }
    
    if (replicate_status !== "succeeded") {
      throw new Error(`Training failed: ${replicate_status}`);
    }
    
    // Download LoRA weights (.tar)
    const weights_url = checkData.output.weights;
    console.log(`Downloading weights from: ${weights_url}`);
    
    const response = await fetch(weights_url);
    const tarFile = await response.arrayBuffer();
    
    // Extract .safetensors file
    console.log("Extracting .safetensors file from tar archive");
    const extractedFiles: { [key: string]: any } = {}; // Allows indexing by string keys
    
    let safetensorFile;
    let safetensorPath;
    
    // Find the .safetensors file
    for (const filePath of Object.keys(extractedFiles)) {
      if (filePath.endsWith(".safetensors")) {
        safetensorFile = extractedFiles[filePath];
        safetensorPath = filePath;
        break;
      }
    }
    
    if (!safetensorFile) {
      throw new Error("No .safetensors file found in tar archive.");
    }
    
    console.log(`Found .safetensors file at path: ${safetensorPath}`);
    
    // Upload .safetensors file to Supabase Storage
    console.log(`Uploading to ${output_bucket}/${output_path}`);
    
    const { error: uploadError } = await supabase.storage
      .from(output_bucket)
      .upload(output_path, safetensorFile, {
        contentType: "application/octet-stream",
        upsert: true
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Generate public URL for the file
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${output_bucket}/${output_path}`;
    console.log(`File uploaded successfully. Public URL: ${fileUrl}`);
    
    // Update lora_training table with output file URL & set status to "completed"
    const { error: updateError } = await supabase
      .from("lora_training")
      .update({
        training_status: "completed",
        output_lora: fileUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Delete Replicate model
    console.log(`Deleting model ${replicateUsername}/${modelName}`);
    
    const deleteResponse = await fetch(`https://api.replicate.com/v1/models/${replicateUsername}/${modelName}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_KEY}`
      }
    });
    
    if (!deleteResponse.ok) {
      const deleteError = await deleteResponse.json();
      console.error("Model deletion failed:", deleteError);
    } else {
      console.log("Model deleted successfully");
    }
    
    return NextResponse.json({ 
      status: "completed", 
      output_lora: fileUrl 
    });
    
  } catch (error) {
    console.error("Backend processing error:", error);
    
    try {
      // Extract record from request
      const { record } = await req.json();
      const { id } = record;
      
      // Update training status to failed
      await supabase
        .from("lora_training")
        .update({
          training_status: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
        
    } catch (secondaryError) {
      console.error("Error in error handler:", secondaryError);
      return NextResponse.json(
        { status: "failed", error: secondaryError },
        { status: 500 }
      );
    }
    
    
  }
}