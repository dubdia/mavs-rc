import * as fs from "fs";
import { app } from "electron";
import log from "electron-log/main";
import { SshCert } from "./models/SshCert";
import { currentPath } from "../shared/utils/path-utils";

/** can be used to retrieve a list of ssh certs */
export class SshCertManager {

  /** return a list of available ssh certs */
  public listSshCerts(): SshCert[] {
    // for now the ssh path is fixed //Todo
    const sshDir = currentPath().join(app.getPath("home"), ".ssh");
    const sshDirExists = fs.existsSync(sshDir);
    if (!sshDirExists) {
      log.warn(`Could not find Users .ssh directory: ${sshDir}`);
      return [];
    }

    // read directory
    const fileNames = fs.readdirSync(sshDir);
    const certs: SshCert[] = [];
    for (const fileName of fileNames) {
      // check file name
      if (fileName == null || fileName == "" || fileName.startsWith(".")) {
        continue; // must have valid name
      }
      if (fileName.endsWith(".ppk")) {
        continue; // must not be public key
      }

      // build path
      const filePath = currentPath().join(sshDir, fileName);

      // check stats
      const fileStats = fs.statSync(filePath);
      if (fileStats.isDirectory() || !fileStats.isFile()) {
        continue; // must be a file
      }
      if (fileStats.size <= 0 || fileStats.size > 1024 * 32) {
        continue; // certs are not that big
      }

      // add
      certs.push({
        name: fileName,
        filePath: filePath,
      });
    }
    log.verbose(`Found ${certs.length} ssh certificates in ${sshDir}`);
    return certs;
  }

  /** returns the content of the ssh cert with given @param certName */
  public getSshCertContent(certName: string): string {
    // check name
    if (certName == null || certName == "") {
      throw new Error("No cert name was given");
    }

    // find file path
    const certs = this.listSshCerts();
    const cert = certs.find((x) => x.name == certName);
    if (cert == null) {
      throw new Error("Could not find cert by name: " + certName);
    }

    // read it
    if (!fs.existsSync(cert.filePath)) {
      throw new Error("Could not find cert file for: " + cert.filePath);
    }
    const buffer = fs.readFileSync(cert.filePath);
    const contents = buffer.toString();

    log.info(`Read Ssh certificate file: ${cert.filePath} (${buffer.length} bytes)`);
    return contents;
  }

  /** returns the file-path of the ssh cert with given @param certName */
  public getSshCertFilePath(certName: string): string {
    // check name
    if (certName == null || certName == "") {
      throw new Error("No cert name was given");
    }

    // find file path
    const certs = this.listSshCerts();
    const cert = certs.find((x) => x.name == certName);
    if (cert == null) {
      throw new Error("Could not find cert by name: " + certName);
    }

    // check it
    if (!fs.existsSync(cert.filePath)) {
      throw new Error("Could not find cert file for: " + cert.filePath);
    }

    return cert.filePath;
  }
}
