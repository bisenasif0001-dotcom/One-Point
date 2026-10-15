const fs = require('fs');

const html = fs.readFileSync('services.html', 'utf8');
console.log('File size:', html.length);

const sections = [];
const secMatches = html.matchAll(/<section[^>]*id="([^"]+)"[^>]*>/g);
for (const m of secMatches) {
  sections.push(m[1]);
}
console.log('Sections found:', sections);

// Search input and combobox
const searchInputs = html.match(/<input[^>]*type="search"[^>]*>|<input[^>]*id="[^"]*search[^"]*"[^>]*>/gi);
console.log('Search inputs:', searchInputs);

// Search toolbar / filter panel
const toolbarMatches = html.match(/class="[^"]*shub-toolbar[^"]*"/gi);
console.log('Toolbar matches:', toolbarMatches);

// Find where scripts are in services.html
const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi);
console.log('Total script tags:', scriptMatches ? scriptMatches.length : 0);
if (scriptMatches) {
  scriptMatches.forEach((s, i) => {
    const src = s.match(/src="([^"]+)"/);
    if (src) {
      console.log(`Script ${i}: src=${src[1]}`);
    } else {
      console.log(`Script ${i}: inline (${s.length} chars)`);
    }
  });
}
