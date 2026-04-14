const Minio = require("minio");

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin123",
});

const minioPublicClient = new Minio.Client({
  endPoint:
    process.env.MINIO_EXTERNAL_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    "localhost",
  port: parseInt(
    process.env.MINIO_EXTERNAL_PORT || process.env.MINIO_PORT || "9000",
  ),
  useSSL:
    process.env.MINIO_EXTERNAL_USE_SSL !== undefined
      ? process.env.MINIO_EXTERNAL_USE_SSL === "true"
      : process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin123",
});

const BUCKETS = {
  PDFS: process.env.MINIO_BUCKET_PDFS || "livres-pdf",
  COVERS: process.env.MINIO_BUCKET_COVERS || "livres-couvertures",
};

/**
 * Create buckets if they don't already exist.
 * Call this once at app startup.
 */
const initBuckets = async () => {
  for (const bucket of Object.values(BUCKETS)) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(
        bucket,
        process.env.MINIO_REGION || "us-east-1",
      );
      console.log(`✅ MinIO bucket créé : ${bucket}`);
    } else {
      console.log(`☑️  MinIO bucket existant : ${bucket}`);
    }
  }
};

module.exports = { minioClient, minioPublicClient, BUCKETS, initBuckets };
