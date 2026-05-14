const METADATA_IDENTITY_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity';

export async function getCloudRunIdentityToken(audience: string): Promise<string> {
  const url = new URL(METADATA_IDENTITY_URL);
  url.searchParams.set('audience', audience);
  url.searchParams.set('format', 'full');

  const response = await fetch(url, {
    headers: {
      'Metadata-Flavor': 'Google',
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch Cloud Run identity token: ${response.status}`);
  }

  return response.text();
}
