console.log("DEPLOY SCRIPT BAŞLADI");

import ftp from "basic-ftp";
import "dotenv/config";
import path from "node:path";

const client = new ftp.Client();

client.ftp.verbose = true;

try {
  const localDir = path.resolve("dist");

  await client.access({
    host: process.env.FTP_HOST,
    port: Number(process.env.FTP_PORT),
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: false,
  });

  console.log("FTP bağlantısı başarılı.");
  console.log(`Yerel klasör: ${localDir}`);
  console.log(`Sunucu klasörü: ${process.env.FTP_REMOTE_DIR}`);

  await client.ensureDir(process.env.FTP_REMOTE_DIR);
  await client.clearWorkingDir();
  await client.uploadFromDir(localDir);

  console.log("✓ drAW sunucuya başarıyla yüklendi.");
} catch (error) {
  console.error("✗ FTP yükleme hatası:");
  console.error(error);
  process.exitCode = 1;
} finally {
  client.close();
}