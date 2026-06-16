import { Login, SignSshKey } from './bao.js';
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
    const principals = core.getInput('principals');
    let outputFile = core.getInput('outputFile');

    const workspace = process.env.GITHUB_WORKSPACE || '.';
    const privateKeyPath = path.join(workspace, outputFile);
    const publicKeyPath = `${privateKeyPath}.pub`;
    const certPath = `${privateKeyPath}-cert.pub`;

    core.info(`Generazione chiave SSH locale in: ${privateKeyPath}`);
    execSync(`ssh-keygen -t ed25519 -f "${privateKeyPath}" -N "" -q`);
    const publicKeyContent = fs.readFileSync(publicKeyPath, 'utf8');

    core.info('Avvio autenticazione AppRole su OpenBao...');

    const clientToken = await Login({ roleId, secretId, domain: baoUrl });

    core.info(`Autenticazione riuscita. Richiesta firma chiave al path: ${sshPath}`);

    const signedKey = await SignSshKey({ sshPath, publicKey: publicKeyContent, principals, token: clientToken, domain: baoUrl });

    fs.writeFileSync(certPath, signedKey);
    fs.chmodSync(privateKeyPath, 0o600);
    core.info(`Chiave SSH firmata salvata in: ${certPath}`);
  } catch (error) {
    // In caso di errore, fallisce l'azione restituendo un messaggio chiaro
    core.setFailed(`Errore durante l'esecuzione dell'action: ${error.message}`);
  }
}

run();