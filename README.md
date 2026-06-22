# OpenBao SSH Key Fetcher GitHub Action

Questa GitHub Action ti permette di recuperare chiavi SSH temporanee ed emettere certificati firmati da un'istanza **OpenBao** (o Vault) utilizzando l'autenticazione **AppRole**. 

È ideale per i flussi di CI/CD in cui è necessario connettersi in modo sicuro a server remoti tramite SSH senza memorizzare chiavi private a lungo termine nei segreti di GitHub.

---

## 🌟 Funzionalità Principali

- **Autenticazione AppRole**: Sfrutta il metodo `role_id` e s`ecret_id` nativo di OpenBao per un accesso sicuro non interattivo.
- **Emissione Dinamica**: Sfrutta l'endpoint `issue` per generare una nuova coppia di chiavi (ED25519) direttamente sul server OpenBao ad ogni esecuzione.
- **Permessi Automatici**: Applica automaticamente i permessi restrittivi di sicurezza (`chmod 600`) sulla chiave privata scaricata per evitare rifiuti da parte del client OpenSSH.
- **Flessibilità**: Gestisce in modo sicuro le risposte nel caso in cui il backend non restituisca la chiave pubblica "liscia", salvando solo la chiave privata e il certificato firmato.

---


## 🚀 Esempio di Utilizzo

Aggiungi questo step al tuo file workflow `.yml` (es. `.github/workflows/deploy.yml`):

```yaml
- name: Ottieni Certificato SSH da OpenBao
  uses: Likablehair/bao-ssh-action@v1.0.0
  with:
    baoUrl: 'https://openbao.likablehair.it'
    roleId: ${{ secrets.BAO_ROLE_ID }}
    secretId: ${{ secrets.BAO_SECRET_ID }}
    sshPath: 'test1_ssh/issue/lh'
    validPrincipals: 'lh'
    outputFile: /id_ed25519
```

## Input dell'Action

| Nome Input | Descrizione                                                        | Obbligatorio | Default             |
|------------|--------------------------------------------------------------------|--------------|---------------------|
| baoUrl     | L'URL base della tua istanza OpenBao (es. https://vault.mio-dominio.com).  | Sì           |                     |
| roleId     | Il Role ID generato dal metodo di auth AppRole.                    | Sì           |                     |
| secretId   | Il Secret ID generato dal metodo di auth AppRole.                  | Sì           |                     |
| sshPath | Il percorso interno a cui fare le issue (es. ssh/issue/mio-ruolo-ssh). | Sì           |                     |
| validPrincipals | I nomi degli utenti validi per il certificato SSH (es. "user1,user2"). | No          |                     |
| outputFile | Il nome e percorso del file su cui scrivere la chiave. | No           | id_ed25519 |