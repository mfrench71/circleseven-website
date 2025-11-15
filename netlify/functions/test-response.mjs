export default async function handler(request, context) {
  return new Response(JSON.stringify({ test: 'working' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
