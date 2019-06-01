const fs = require('fs');
const { SaxEventType, SAXParser } = require('sax-wasm');
// Get the path to the WebAssembly binary and load it
const saxPath = require.resolve('sax-wasm/lib/sax-wasm.wasm');
const saxWasmBuffer = fs.readFileSync(saxPath);
// Instantiate
const options = { highWaterMark: 32 * 1024 }; // 32k chunks
const parser = new SAXParser(
  SaxEventType.OpenTag | SaxEventType.CloseTag | SaxEventType.Text,
  options
);

class Plummet {

  constructor(transform) {
    this.map = [];
    this.transform = transform;
    this.result = '';
  }

  getTopEntry = () => {
    return this.map[this.map.length - 1];
  };

  openTagToString = entry => {
    const attributes = entry.attributes.map(
      ({ name, value }) => ` ${name}="${value}"`
    );
    return `<${entry.name}${attributes}>`;
  };

  convertEntryToString = entry => {
    return `${this.openTagToString(entry)}${entry.content}</${entry.name}>`;
  };

  getParent = () => {
    return this.map[this.map.length - 1];
  };

  onOpenTag = node => {
    const newEntry = {
      ...node,
      content: '',
      parent: this.getParent() || null,
    };
    this.map.push(newEntry);
  };

  onText = text => {
    const topEntry = this.getTopEntry();
    if (topEntry) {
      topEntry.content += text;
    } else {
      this.result += text;
    }
  };

  onCloseTag = name => {
    if (this.map[this.map.length - 1].name !== name) return;
    const finished = this.map.pop();
    const transformed = this.transform(finished);
    const asString = this.convertEntryToString(transformed);
    if (this.map.length !== 0)
      this.map[this.map.length - 1].content += asString;
    if (this.map.length === 0) this.result += asString;
  };

  getResult = () => {
    return this.result;
  };
}

function map(html, transformer = x => x) {
  return new Promise((resolve, reject) => {
    const plummet = new Plummet(transformer);
    parser.eventHandler = (event, data) => {
      if (event === SaxEventType.OpenTag) {
        const obj = { name: data.name, attributes: data.attributes };
        obj.attributes = obj.attributes.map(attribute => ({
          name: attribute.name,
          value: attribute.value,
        }));
        plummet.onOpenTag(obj);
      }
      if (event === SaxEventType.CloseTag) {
        const name = data.name;
        plummet.onCloseTag(name);
      }
      if (event === SaxEventType.Text) {
        plummet.onText(data.value);
      }
    };
  
    // Instantiate and prepare the wasm for parsing
    parser.prepareWasm(saxWasmBuffer).then(ready => {
      if (ready) {
        const Readable = require('stream').Readable;
        const readable = new Readable();
        readable._read = () => {};
        readable.on('data', chunk => {
          parser.write(chunk);
        });
        readable.on('end', () => {
          parser.end();
          const result = plummet.getResult();
          resolve(result);
        });
        readable.push(html);
        readable.push(null);
      }
    });
  });
}

module.exports = map;
