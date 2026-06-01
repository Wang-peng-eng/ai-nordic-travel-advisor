import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("./config/travelData")) {
  source = source.replace(
    '} from "lucide-react";\n',
    '} from "lucide-react";\nimport { destinationKnowledgeBase, hotelDatabase, pricingRules, supplierDatabase } from "./config/travelData";\n',
  );
}

const start = source.indexOf("const destinationKnowledgeBase");
const end = source.indexOf("const customerTypeRules");

if (start !== -1 && end !== -1 && end > start) {
  source = source.slice(0, start) + source.slice(end);
}

fs.writeFileSync(path, source, "utf8");
