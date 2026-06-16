

export const Login = async ({ roleId, secretId, domain}) => {
    const loginRes = await fetch(`${domain}/v1/auth/approle/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, secret_id: secretId })
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Autenticazione fallita (${loginRes.status}): ${errText}`);
    }
    const loginData = await loginRes.json();

    return loginData.auth.client_token;
}

export const SignSshKey = async ({ sshPath, publicKey, validPrincipals, token, domain }) => {
  const signPayload = {
    public_key: publicKey,
    valid_principals: validPrincipals ? validPrincipals.split(',').map(p => p.trim()) : undefined,
  };

  const signRes = await fetch(`${domain}/v1/${sshPath}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `X-Vault-Token ${token}`
    },
    body: JSON.stringify(signPayload)
  });

  if (!signRes.ok) {
    const errText = await signRes.text();
    throw new Error(`Firma chiave SSH fallita (${signRes.status}): ${errText}`);
  }
  const signData = await signRes.json();

  return signData.data.signed_key;
}

export const IssueSshKey = async ({ sshPath, validPrincipals, token, domain }) => {
  const issueRes = await fetch(`${domain}/v1/${sshPath}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `X-Vault-Token ${token}`
    },
    body: JSON.stringify({
      key_type: 'ed25519',
      valid_principals: validPrincipals,
    })
  });

  if (!issueRes.ok) {
    const errText = await issueRes.text();
    throw new Error(`Emissione chiave SSH fallita (${issueRes.status}): ${errText}`);
  }
  const issueData = await issueRes.json();

  return issueData.data;
}