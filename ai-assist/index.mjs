// Lambda handler for /ai-assist endpoint (mocked AI)
export const handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' }
  try {
    // Return 4 mock styles for local/dev, matching frontend expectation
    const mockImages = [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+1n1cAAAAASUVORK5CYII=', // red
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AAAgMBAJcF+ZcAAAAASUVORK5CYII=', // green
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwAAAgMBAJcF+ZcAAAAASUVORK5CYII=', // blue
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAwMCAO+1n1cAAAAASUVORK5CYII='  // black
    ]
    const styles = [
      { name: 'Style A', image: mockImages[0] },
      { name: 'Style B', image: mockImages[1] },
      { name: 'Style C', image: mockImages[2] },
      { name: 'Style D', image: mockImages[3] }
    ]
    return { statusCode: 200, headers: cors, body: JSON.stringify({ styles }) }
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) }
  }
}
