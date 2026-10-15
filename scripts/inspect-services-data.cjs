const fs = require('fs');

const html = fs.readFileSync('services.html', 'utf8');

// Find the inline script content
const match = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/i);
if (match) {
  const code = match[1];
  console.log('Inline script length:', code.length);

  // Check for data arrays / variables
  const varMatches = code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(\[|\{)/g);
  console.log('Declared data structures:', varMatches);

  // Check for search logic
  const searchFuncs = code.match(/function\s+([a-zA-Z0-9_$]+)|\b([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)/g);
  console.log('Functions:', searchFuncs ? searchFuncs.slice(0, 20) : null);

  // Check if SERVICES_DATA or similar exists
  const mServices = code.match(/const\s+(SERVICES|SERVICES_DATA|ALL_SERVICES|servicesData|catalog)\s*=\s*\[([\s\S]*?)\];/);
  if (mServices) {
    console.log('Found service catalog variable:', mServices[1]);
  } else {
    // Check first 100 lines of script
    const lines = code.split('\n').slice(0, 40);
    console.log('Script preview:');
    console.log(lines.join('\n'));
  }
} else {
  console.log('No inline script found');
}
