(function (global) {
  "use strict";

  const SCHEMA_IMPORT = "import io.swagger.v3.oas.annotations.media.Schema;";

  function splitCamelCase(value) {
    if (!value) {
      return [];
    }

    return value
      .replace(/[_-]+/g, " ")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Za-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([A-Za-z])/g, "$1 $2")
      .split(/\s+/)
      .filter(Boolean);
  }

  function escapeJavaString(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function stripExistingSchemaAnnotations(value) {
    return value.replace(/@Schema\s*\([^)]*\)\s*/g, "");
  }

  function splitStatements(input) {
    const statements = [];
    let current = "";
    let quote = "";
    let escaping = false;

    for (const char of input.replace(/\r\n/g, "\n")) {
      current += char;

      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if ((char === '"' || char === "'") && !quote) {
        quote = char;
        continue;
      }

      if (quote && char === quote) {
        quote = "";
        continue;
      }

      if (char === ";" && !quote) {
        statements.push(current);
        current = "";
      }
    }

    if (current.trim()) {
      statements.push(current);
    }

    return statements;
  }

  function parsePrivateField(statement) {
    const indentMatch = statement.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0].replace(/\n/g, "") : "";
    const cleaned = stripExistingSchemaAnnotations(statement).trim();
    const fieldMatch = cleaned.match(
      /^(private\s+(?:(?:static|final|transient|volatile)\s+)*)([\w.$<>\[\], ?]+?)\s+([A-Za-z_$][\w$]*)(\s*(?:=[\s\S]*)?;)$/
    );

    if (!fieldMatch) {
      return null;
    }

    return {
      indent,
      declaration: cleaned,
      name: fieldMatch[3]
    };
  }

  function buildDescription(fieldName, dictionary) {
    const tokens = splitCamelCase(fieldName);
    const missing = [];
    const parts = tokens.map((token) => {
      const key = token.toLowerCase();
      const translated = dictionary[key];

      if (!translated) {
        missing.push(token);
        return token;
      }

      return translated;
    });

    return {
      description: parts.join(""),
      missing,
      tokens
    };
  }

  function convertDtoFields(input, options) {
    const dictionary = options.dictionary || {};
    const includeImport = Boolean(options.includeImport);
    const statements = splitStatements(input);
    const converted = [];
    const unknowns = [];

    statements.forEach((statement) => {
      const parsed = parsePrivateField(statement);

      if (!parsed) {
        const original = statement.trim();
        if (original) {
          converted.push(original);
        }
        return;
      }

      const result = buildDescription(parsed.name, dictionary);
      if (result.missing.length > 0) {
        unknowns.push({
          field: parsed.name,
          tokens: result.missing
        });
      }

      converted.push(
        `${parsed.indent}@Schema(description = "${escapeJavaString(result.description)}", example = "")`,
        `${parsed.indent}${parsed.declaration}`
      );
    });

    const body = converted.join("\n");
    return {
      output: includeImport && body ? `${SCHEMA_IMPORT}\n\n${body}` : body,
      unknowns
    };
  }

  function renderDictionary(dictionary) {
    return Object.entries(dictionary)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  function formatUnknowns(unknowns) {
    if (unknowns.length === 0) {
      return "모든 토큰을 단어장에서 찾았습니다.";
    }

    return unknowns
      .map((item) => `${item.field}: ${item.tokens.join(", ")}`)
      .join("\n");
  }

  async function copyText(text, textarea) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    textarea.focus();
    textarea.select();
    document.execCommand("copy");
  }

  function setupPage() {
    const dictionary = global.DTO_SCHEMA_WORDS || {};
    const input = document.querySelector("#source");
    const output = document.querySelector("#result");
    const dictionaryView = document.querySelector("#dictionaryView");
    const unknownView = document.querySelector("#unknownView");
    const includeImport = document.querySelector("#includeImport");
    const convertButton = document.querySelector("#convertButton");
    const copyButton = document.querySelector("#copyButton");
    const clearButton = document.querySelector("#clearButton");

    dictionaryView.value = renderDictionary(dictionary);

    function runConvert() {
      const result = convertDtoFields(input.value, {
        dictionary,
        includeImport: includeImport.checked
      });

      output.value = result.output;
      unknownView.textContent = formatUnknowns(result.unknowns);
    }

    convertButton.addEventListener("click", runConvert);
    includeImport.addEventListener("change", runConvert);

    copyButton.addEventListener("click", async () => {
      await copyText(output.value, output);
      copyButton.textContent = "복사 완료";
      window.setTimeout(() => {
        copyButton.textContent = "결과 복사";
      }, 1200);
    });

    clearButton.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      unknownView.textContent = "";
      input.focus();
    });

    runConvert();
  }

  global.DtoSchemaTool = {
    buildDescription,
    convertDtoFields,
    parsePrivateField,
    splitCamelCase,
    splitStatements
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.DtoSchemaTool;
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", setupPage);
  }
})(typeof window !== "undefined" ? window : globalThis);
