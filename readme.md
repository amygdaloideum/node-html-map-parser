# Nodejs HTML map parser

## Use case
You have a static site generator that fetches blog posts from an api. You convert the posts from markdown to HTML. Now you have a HTML string. You want to add syntax highlighting and header anchors to your HTML string before saving it as a file. You also want your page to be able to run with javascript disabled. This library makes that easy.

It is useful in cases where you have a HTML string and would like to modify the content of all instances of certain elements. I have not found any other XML/HTML parser libraries that makes this task easy.

## TL;DR
This lib is useful for:
* Adding syntax highlighting to your static site without using runtime javascript.
* Adding Header anchors to your static site without using runtime javascript.

## Usage

This parser has an api somewhat similar to `Array.map`. Every node (element) of the HTML string will be passed to the `transformer` function, before being converted back to HTML and placed back in the string.

```javascript
const Prism = require('prismjs');
const parse = require('html-map-parser');

const highlight = snippet =>
  Prism.highlight(snippet, Prism.languages.javascript, 'javascript');


const htmlString = `
  <h2 id="header-without-anchor">
    Header without anchor
  </h2>
  <pre>
    <code>
      const noop = () => {};
    </code>
  </pre>
`;

function transformer(node) {
  // Syntax highlighting with prism
  if (node.name === 'code' && node.parent && node.parent.name === 'pre') {
    return { ...node, content: highlight(node.content) };
  }

  // Header anchors
  if(node.name === 'h2' || node.name === 'h1') {
    const idAttr = node.attributes.find(attr => attr.name === 'id');
    if(!idAttr) return node;
    return { ...node, content: `<a href="#${idAttr.value}">#</a>${node.content}`}
  }

  return node;
}

const processedHtml = parse(htmlString, transformer);
```

## API

### `function parse(htmlString: String, transformer: TransformerFunction): String`
Returns a HTML string after it has applied the `transformer` function to all the nodes.

### `function TransformerFunction(node: Node): Node`
Gets passed a node and should return a transformed node.

### `object Node`
The node object has the following properties:

| property   | type        | description                                                       |
|------------|-------------|-------------------------------------------------------------------|
| name       | String      | The element type, e.g. 'h1'                                       |
| parent     | ?Node        | A `Node` object like this that is the parent of this node        |
| attributes | Array       | An array of attribute object. i.e. `{ name: 'id', value: '123' }` |
| content    | String      | the content of the html tag                                       |
