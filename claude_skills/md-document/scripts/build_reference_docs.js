#!/usr/bin/env node
/**
 * One-off generator: branded pandoc reference .docx files (docx npm / docx-js).
 * Run from repo root: node claude_skills/md-document/scripts/build_reference_docs.js
 *
 * Options:
 *   --themes-dir <path>   Default: ../themes (relative to this script)
 */

import {
  Document,
  Packer,
  Paragraph,
  Header,
  Footer,
  AlignmentType,
  ImageRun,
  TextRun,
  Tab,
  SimpleField,
  TabStopType,
  TabStopPosition,
} from "docx";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLACEHOLDER = "__SENSITIVITY__";

/** 1×1 transparent PNG */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
);

const THEMES = {
  comotion: {
    fileKey: "comotion-reference.docx",
    primary: "1A3B66",
    bodyFont: "Roboto",
    headingFont: "Roboto",
    logoSvg: "comotion/assets/comotion-logo-svg-colour.svg",
  },
  "comotion-ai": {
    fileKey: "comotion-ai-reference.docx",
    primary: "1A3B66",
    bodyFont: "Inter",
    headingFont: "Inter",
    logoSvg: "comotion-ai/assets/comotion-ai-logo-svg.svg",
  },
  seedanalytics: {
    fileKey: "seedanalytics-reference.docx",
    primary: "051F4C",
    bodyFont: "Plus Jakarta Sans",
    headingFont: "Sora",
    logoSvg: "seedanalytics/assets/seed-analytics-logo-svg-colour.svg",
  },
};

function parseArgs() {
  const argv = process.argv.slice(2);
  let themesDir = path.resolve(__dirname, "../themes");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--themes-dir" && argv[i + 1]) {
      themesDir = path.resolve(argv[++i]);
    }
  }
  return { themesDir };
}

function getPandocStylesXmlSync() {
  const tmp = path.join(os.tmpdir(), `pandoc-ref-${Date.now()}.docx`);
  execFileSync("pandoc", ["-o", tmp, "--print-default-data-file", "reference.docx"], {
    stdio: "pipe",
  });
  const xml = execFileSync("unzip", ["-p", tmp, "word/styles.xml"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  fs.unlinkSync(tmp);
  return xml;
}

function replaceStyleBlock(xml, styleId, newBlock) {
  const re = new RegExp(
    `<w:style[^>]*w:styleId="${styleId}"[^>]*>[\\s\\S]*?<\\/w:style>`,
    "m"
  );
  if (!re.test(xml)) {
    throw new Error(`Style block not found: ${styleId}`);
  }
  return xml.replace(re, newBlock);
}

function patchStylesXml(baseXml, { primary, bodyFont, headingFont }) {
  const fonts = (ascii) =>
    `<w:rFonts w:ascii="${ascii}" w:hAnsi="${ascii}" w:cs="Arial" w:eastAsia="Arial"/>`;

  const docDefaults = `<w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        ${fonts(bodyFont)}
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="${primary}"/>
        <w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="200"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>`;

  let xml = baseXml.replace(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/m, docDefaults);

  const normal = `<w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      ${fonts(bodyFont)}
      <w:color w:val="${primary}"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "Normal", normal);

  const h1 = `<w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:link w:val="Heading1Char"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="360" w:after="120"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      ${fonts(headingFont)}
      <w:b/>
      <w:color w:val="${primary}"/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "Heading1", h1);

  const h2 = `<w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:link w:val="Heading2Char"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="80"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      ${fonts(headingFont)}
      <w:b/>
      <w:color w:val="${primary}"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "Heading2", h2);

  const h3 = `<w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:link w:val="Heading3Char"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="180" w:after="60"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      ${fonts(headingFont)}
      <w:b/>
      <w:color w:val="${primary}"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "Heading3", h3);

  const compact = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="Compact">
    <w:name w:val="Compact"/>
    <w:basedOn w:val="BodyText"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="36" w:after="36"/>
    </w:pPr>
    <w:rPr>
      ${fonts(bodyFont)}
      <w:color w:val="${primary}"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "Compact", compact);

  const verbatim = `<w:style w:type="character" w:customStyle="1" w:styleId="VerbatimChar">
    <w:name w:val="Verbatim Char"/>
    <w:basedOn w:val="BodyTextChar"/>
    <w:rPr>
      <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:eastAsia="Arial"/>
      <w:sz w:val="18"/>
      <w:szCs w:val="18"/>
    </w:rPr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "VerbatimChar", verbatim);

  const table = `<w:style w:type="table" w:default="1" w:styleId="Table">
    <w:name w:val="Table"/>
    <w:basedOn w:val="TableNormal"/>
    <w:semiHidden/>
    <w:unhideWhenUsed/>
    <w:qFormat/>
    <w:tblPr>
      <w:tblInd w:w="0" w:type="dxa"/>
      <w:tblCellMar>
        <w:top w:w="0" w:type="dxa"/>
        <w:left w:w="108" w:type="dxa"/>
        <w:bottom w:w="0" w:type="dxa"/>
        <w:right w:w="108" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblStylePr w:type="firstRow">
      <w:rPr>
        <w:b/>
        <w:color w:val="FFFFFF"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
      <w:tcPr>
        <w:shd w:val="clear" w:fill="${primary}" w:color="auto"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
    </w:tblStylePr>
  </w:style>`;
  xml = replaceStyleBlock(xml, "Table", table);

  const sourceCode = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="SourceCode">
    <w:name w:val="Source Code"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:shd w:val="clear" w:fill="EEEEEE" w:color="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:eastAsia="Arial"/>
      <w:sz w:val="18"/>
      <w:szCs w:val="18"/>
      <w:color w:val="333333"/>
    </w:rPr>
  </w:style>`;

  const codeBlock = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:shd w:val="clear" w:fill="EEEEEE" w:color="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:eastAsia="Arial"/>
      <w:sz w:val="18"/>
      <w:szCs w:val="18"/>
      <w:color w:val="333333"/>
    </w:rPr>
  </w:style>`;

  const tableHeader = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="TableHeader">
    <w:name w:val="Table Header"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      ${fonts(bodyFont)}
      <w:b/>
      <w:color w:val="FFFFFF"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
    <w:pPr>
      <w:shd w:val="clear" w:fill="${primary}" w:color="auto"/>
    </w:pPr>
  </w:style>`;

  const tableBody = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="TableBody">
    <w:name w:val="Table Body"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      ${fonts(bodyFont)}
      <w:color w:val="${primary}"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
  </w:style>`;

  const insert = `${sourceCode}\n${codeBlock}\n${tableHeader}\n${tableBody}\n`;
  if (!xml.includes('w:styleId="SourceCode"')) {
    xml = xml.replace(/<\/w:styles>\s*$/m, `${insert}</w:styles>`);
  }

  return xml;
}

function svgToPng(svgPath, outPng) {
  const tryCmd = (cmd, args) => {
    const r = spawnSync(cmd, args, { encoding: "utf8" });
    return r.status === 0 && fs.existsSync(outPng) && fs.statSync(outPng).size > 0;
  };
  if (tryCmd("rsvg-convert", ["-o", outPng, svgPath])) return true;
  if (tryCmd("/opt/homebrew/bin/rsvg-convert", ["-o", outPng, svgPath])) return true;
  if (tryCmd("cairosvg", [svgPath, "-o", outPng])) return true;
  if (tryCmd("inkscape", [svgPath, "--export-type=png", `--export-filename=${outPng}`]))
    return true;
  fs.writeFileSync(outPng, TINY_PNG);
  console.warn(`WARN: Could not convert ${svgPath} to PNG; using 1×1 transparent placeholder.`);
  return false;
}

function buildFooterParagraph(primary, bodyFont) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({
        text: PLACEHOLDER,
        font: bodyFont,
        size: 16,
        color: primary,
      }),
      new TextRun({ children: [new Tab()] }),
      new TextRun({ text: "Page ", font: bodyFont, size: 16, color: primary }),
      new SimpleField("PAGE"),
      new TextRun({ text: " of ", font: bodyFont, size: 16, color: primary }),
      new SimpleField("NUMPAGES"),
    ],
  });
}

async function buildOne(themeKey, theme, themesDir, outDir) {
  const svgPath = path.join(themesDir, theme.logoSvg);
  const pngPath = path.join(os.tmpdir(), `logo-${themeKey}-${Date.now()}.png`);
  svgToPng(svgPath, pngPath);
  const logoBuf = fs.readFileSync(pngPath);

  let stylesXml;
  try {
    stylesXml = getPandocStylesXmlSync();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  const externalStyles = patchStylesXml(stylesXml, {
    primary: theme.primary,
    bodyFont: theme.bodyFont,
    headingFont: theme.headingFont,
  });

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: logoBuf,
            transformation: { width: 220, height: 64 },
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [buildFooterParagraph(theme.primary, theme.bodyFont)],
  });

  const doc = new Document({
    externalStyles,
    features: {
      updateFields: true,
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1800,
              right: 1440,
              header: 720,
              footer: 720,
              gutter: 0,
            },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [new Paragraph({ children: [] })],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = path.join(outDir, theme.fileKey);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

async function main() {
  const { themesDir } = parseArgs();
  const outDir = path.resolve(__dirname, "../templates");
  fs.mkdirSync(outDir, { recursive: true });

  if (!fs.existsSync(themesDir)) {
    console.error(`themes-dir not found: ${themesDir}`);
    process.exit(1);
  }

  for (const key of Object.keys(THEMES)) {
    const p = await buildOne(key, THEMES[key], themesDir, outDir);
    console.log("Wrote", p);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
