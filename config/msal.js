import * as msal from "@azure/msal-node";

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
};

const msalInstance = new msal.ConfidentialClientApplication(msalConfig);

export const getAuthUrl = async () => {
  const authCodeUrlParameters = {
    scopes: ["user.read", "openid", "profile", "email"],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  };
  return await msalInstance.getAuthCodeUrl(authCodeUrlParameters);
};

export const acquireTokenByCode = async (code) => {
  const tokenRequest = {
    code,
    scopes: ["user.read", "openid", "profile", "email"],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  };
  return await msalInstance.acquireTokenByCode(tokenRequest);
};

export default msalInstance;
