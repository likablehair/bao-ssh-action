# OpenBao SSH Certificate Action

A GitHub / Gitea Action that authenticates to **OpenBao** (or HashiCorp Vault) with **AppRole** and issues a short-lived, signed SSH key pair using the SSH secrets engine.

Use it in CI/CD pipelines that need to reach remote servers over SSH without storing long-lived private keys in repository secrets.

---

## ✨ Features

- **AppRole authentication** – logs in non-interactively with a `role_id` / `secret_id` pair.
- **Ephemeral keys** – calls the SSH engine's `issue` endpoint, so a brand-new **ED25519** key pair is generated and signed on every run.
- **Ready-to-use files** – writes the private key, the signed certificate and (when returned) the public key using OpenSSH naming conventions, so `ssh` picks up the certificate automatically.
- **Safe permissions** – applies `chmod 600` to the private key so the OpenSSH client doesn't reject it.
- **Tolerant of backend responses** – if OpenBao doesn't return the plain public key, only the private key and certificate are saved.

---

## 🚀 Usage

```yaml
- name: Get SSH certificate from OpenBao
  uses: Likablehair/bao-ssh-action@v1.0.0
  with:
    baoUrl: 'https://openbao.example.com'
    roleId: ${{ secrets.BAO_ROLE_ID }}
    secretId: ${{ secrets.BAO_SECRET_ID }}
    sshPath: 'ssh/issue/my-role'
    validPrincipals: 'deploy'
    outputFile: '.ssh/id_ed25519'
```

### Full example: deploy over SSH

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get SSH certificate from OpenBao
        uses: Likablehair/bao-ssh-action@v1.0.0
        with:
          baoUrl: 'https://openbao.example.com'
          roleId: ${{ secrets.BAO_ROLE_ID }}
          secretId: ${{ secrets.BAO_SECRET_ID }}
          sshPath: 'ssh/issue/my-role'
          validPrincipals: 'deploy'
          outputFile: '.ssh/id_ed25519'

      - name: Run remote command
        run: |
          ssh -i "$GITHUB_WORKSPACE/.ssh/id_ed25519" \
              -o StrictHostKeyChecking=accept-new \
              deploy@server.example.com 'echo "Hello from CI"'

      - name: Remove SSH credentials
        if: always()
        run: rm -f "$GITHUB_WORKSPACE"/.ssh/id_ed25519*
```

`ssh -i <key>` automatically loads `<key>-cert.pub` if it exists next to the key, so no extra flag is needed for the certificate.

---

## ⚙️ Inputs

| Name              | Description                                                                                  | Required | Default      |
|-------------------|----------------------------------------------------------------------------------------------|----------|--------------|
| `baoUrl`          | Base URL of the OpenBao instance (e.g. `https://openbao.example.com`). A trailing `/` is stripped. | Yes      |              |
| `roleId`          | AppRole Role ID.                                                                             | Yes      |              |
| `secretId`        | AppRole Secret ID.                                                                           | Yes      |              |
| `sshPath`         | Path of the SSH engine `issue` endpoint, without the `/v1/` prefix (e.g. `ssh/issue/my-role`). | Yes      |              |
| `validPrincipals` | Comma-separated list of principals (usernames) to embed in the certificate (e.g. `ubuntu,root`). If omitted, the role's defaults apply. | No       |              |
| `outputFile`      | Path of the private key file, **relative to `GITHUB_WORKSPACE`**. Parent directories are created if missing. | No       | `id_ed25519` |

## 📁 Generated files

Given `outputFile: id_ed25519`, the action writes into the workspace:

| File                    | Content                                       |
|-------------------------|-----------------------------------------------|
| `id_ed25519`            | Private key (mode `600`)                      |
| `id_ed25519-cert.pub`   | SSH certificate signed by OpenBao             |
| `id_ed25519.pub`        | Public key (only if returned by OpenBao)      |

> ⚠️ The files are written inside the workspace. Make sure they are not committed, uploaded as artifacts or left on self-hosted runners — delete them at the end of the job.

---

## 🔐 OpenBao setup

The action expects an SSH secrets engine role that allows key issuance, and an AppRole whose policy can call the `issue` endpoint. A minimal example:

```sh
# SSH secrets engine with a CA
bao secrets enable -path=ssh ssh
bao write ssh/config/ca generate_signing_key=true

# Role used to issue user certificates
bao write ssh/roles/my-role \
    key_type=ca \
    allow_user_certificates=true \
    allowed_users="deploy" \
    default_user="deploy" \
    ttl=10m

# Policy allowing the issue endpoint
bao policy write ci-ssh - <<EOF
path "ssh/issue/my-role" {
  capabilities = ["create", "update"]
}
EOF

# AppRole for the CI runner
bao auth enable approle
bao write auth/approle/role/ci token_policies="ci-ssh" token_ttl=5m
bao read auth/approle/role/ci/role-id
bao write -f auth/approle/role/ci/secret-id
```

On the target servers, trust the CA public key (from `bao read -field=public_key ssh/config/ca`) via `TrustedUserCAKeys` in `sshd_config`.
