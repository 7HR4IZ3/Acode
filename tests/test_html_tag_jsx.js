const path = require("path");
const esbuild = require('esbuild');

const html_tag_jsx = "html_tag_jsx";

async function transform(source, options) {
  let result = await esbuild.transform(
    source, options || {
      jsxImportSource: html_tag_jsx, loader: 'jsx',
      jsx: "automatic", jsxSideEffects: true
    }
  );
  return result.code;
}

async function test_single_tag() {
  const source = "<div />";
  const compiled = await transform(source);
  console.log(source, "\n\n", compiled);
}

async function test_single_tag_with_attributes() {
  const source = `
  <div
    active name="Theo"
    onClick={() => console.log()} style={{
      color: "black"
    }}
  ></div>`;

  const compiled = await transform(source);
  console.log(source, "\n\n", compiled);
}

async function test_single_tag_with_children() {
  const source = `
  function app({ name }) {
    return (<div
      active name={name}
      onClick={() => console.log()} style={{
        color: "black"
      }}
    ></div>)
  }

  <div>
    <App name="Me"></App>
    <div>
      <p>Hello World</p>
    </div>
  </div>
`;

  const compiled = await transform(source);
  console.log(source, "\n\n", compiled);
}

async function test_single_tag_with_boilerplate() {
  const source = `
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="x-ua-compatible" content="ie=edge"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title></title>

  <meta name="description" content=""/>
  <meta name="theme-color" content="#fff"/>
  <link rel="shortcut icon" href="favicon.ico"/>

  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content=""/>
  <meta property="og:title" content=""/>
  <meta property="og:description" content=""/>

  <meta property="og:image:alt" content=""/>
  <meta property="og:image" itemprop="image" content="ogimage1200x630.png"/>
  <meta property="og:image:type" content="image/png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image" itemprop="image" content="ogimage300x300.png"/>
  <meta property="og:image:type" content="image/png"/>
  <meta property="og:image:width" content="300"/>
  <meta property="og:image:height" content="300"/>
  <meta name="twitter:card" content="summary_large_image"/>

  <script async src="https://www.googletagmanager.com/gtag/js?id=UA-00000000-0"></script>
</head>
<body>

  <span itemprop="thumbnail" itemscope itemtype="http://schema.org/ImageObject"></span>

  <noscript><div class="msg-bar">This website requires JavaScript.<br />Please enable JavaScript and try&nbsp;again.</div></noscript>
  <div id="no-cookies" class="msg-bar is-hidden">This website uses cookies for authentication.<br />Please enable cookies and try&nbsp;again.</div>

  <svg id="defs" style="display:none">
    <defs>
      <symbol id="svg-arrow" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
        <path d="M8.122 24l-4.122-4 8-8-8-8 4.122-4 11.878 12z" />
      </symbol>
    </defs>
  </svg>

  <div class="layout-center">
    <a class="btn usn" href="https://google.com/ncr" target="_blank" rel="noopener noreferrer">
      Google <span class="btn-ico"><span class="ir"><svg><use xlink:href="#svg-arrow" /></svg></span></span>
    </a>
  </div>
</body>
</html>
`;

  const compiled = await transform(source);
  console.log(source, "\n\n", compiled);
}


async function test() {
  // await test_single_tag();
  // await test_single_tag_with_attributes();
  await test_single_tag_with_children();
  // await test_single_tag_with_boilerplate();
}

test();