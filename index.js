import { Login, SignSshKey, IssueSshKey } from './bao.js';
import * as core from '@actions/core';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function run() {
  try {
    const baoUrl = core.getInput('baoUrl', { required: true }).replace(/\/$/, '');
    const roleId = core.getInput('roleId', { required: true });
    const secretId = core.getInput('secretId', { required: true });
    const sshPath = core.getInput('sshPath', { required: true });
    const validPrincipals = core.getInput('validPrincipals');
    let outputFile = core.getInput('outputFile');

    const workspace = process.env.GITHUB_WORKSPACE || '.';
    const privateKeyPath = path.join(workspace, outputFile);
    const publicKeyPath = `${privateKeyPath}.pub`;
    const certPath = `${privateKeyPath}-cert.pub`;

    core.info('Avvio autenticazione AppRole su OpenBao...');

    const clientToken = await Login({ roleId, secretId, domain: baoUrl });

    core.info(`Autenticazione riuscita. Richiesta firma chiave al path: ${sshPath}`);

    const issueData = await IssueSshKey({ sshPath, validPrincipals, token: clientToken, domain: baoUrl });
    const { private_key, public_key, signed_key } = issueData;

    if (!private_key || !signed_key) {
      throw new Error("La risposta di OpenBao non conteneva 'private_key' o 'signed_key'. Verifica la configurazione del ruolo.");
    }

    fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
    fs.writeFileSync(privateKeyPath, private_key, 'utf8');
    fs.writeFileSync(publicKeyPath, public_key, 'utf8');
    fs.writeFileSync(certPath, signed_key, 'utf8');
    
    fs.chmodSync(privateKeyPath, 0o600);
    core.info(`Chiave SSH firmata salvata in: ${certPath}`);
  } catch (error) {
    // In caso di errore, fallisce l'azione restituendo un messaggio chiaro
    core.setFailed(`Errore durante l'esecuzione dell'action: ${error.message}`);
  }
}

run();