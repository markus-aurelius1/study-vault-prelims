/* Study Vault v2 — dependency-free structural checks for the provisional data contract and route shell.
   Browser layout is verified separately at the target viewports; this script catches broken wiring and brittle counts. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const context = vm.createContext({ window: {} });
vm.runInContext(read("app/js/v2/model/contracts.js"), context, { filename: "contracts.js" });
vm.runInContext(read("app/js/v2/model/mock-data.js"), context, { filename: "mock-data.js" });

const { V2 } = context.window;
const model = V2.createModel(V2.MOCK_DATA);
assert(model.warnings.length === 0, "Mock data has contract warnings: " + model.warnings.join("; "));
assert(model.subjects.length === 1 && model.subjects[0].chapters.length >= 3, "Representative subject hierarchy is missing");
assert(model.byTopic["population-settlements"].subtopics.length === 0, "A topic with no subtopics must remain valid");
assert(model.byTopic["earth-latitude-gravity"].units.length >= 6, "Reader demo units were not resolved");
assert(model.search("latitude", 20).some(row => row.type === "Topic"), "Search does not distinguish topic results");
assert(model.search("apparent weight", 20).some(row => row.type === "Knowledge"), "Search does not distinguish knowledge results");
assert(model.search("2023", 20).some(row => row.type === "PYQ"), "Search does not distinguish PYQ results");
assert(model.filterPyqs({ exam: "UPPCS" }).length === 1, "Question filter does not operate on canonical records");

const many = { subjects: [{ id: "shape-test", name: "Shape test", chapters: Array.from({ length: 15 }, (_, ci) => ({ id: "c" + ci, subjectId: "shape-test", title: "Chapter " + ci, order: ci, topics: Array.from({ length: ci === 0 ? 30 : 1 }, (_, ti) => ({ id: "c" + ci + "t" + ti, chapterId: "c" + ci, title: "Topic " + ti, subtopics: [], knowledgeUnitIds: [] })) })) }], knowledgeUnits: [], pyqs: [] };
const manyModel = V2.createModel(many);
assert(manyModel.subjects[0].chapters.length === 15, "Contract froze the chapter count");
assert(manyModel.subjects[0].chapters[0].topics.length === 30, "Contract froze the topic count");

const index = read("index.html"), app = read("app/js/app.js"), css = read("app/css/v2.css"), views = read("app/js/v2/views/prototype.js"), sw = read("sw.js");
["contracts.js", "mock-data.js", "presentation.js", "prototype.js", "v2.css"].forEach(file => assert(index.includes(file), "index.html does not load " + file));
["v2Subject", "v2Topic", "v2Pyq", "v2Home"].forEach(route => assert(app.includes(route), "Router is missing " + route));
["@media (max-width: 1240px)", "@media (max-width: 900px)", "@media (max-width: 600px)", "prefers-reduced-motion"].forEach(rule => assert(css.includes(rule), "v2 CSS is missing " + rule));
["unit-menu", "open-pyq", "open-context", "data-pyq-filter", "V2.palette"].forEach(hook => assert(views.includes(hook), "v2 interaction hook is missing: " + hook));
["app/css/v2.css", "app/js/v2/model/contracts.js", "app/js/v2/views/prototype.js"].forEach(file => assert(sw.includes(file), "Service worker does not precache " + file + " — rebuild required"));

console.log("Study Vault v2 checks passed");
console.log(`  contract: ${model.subjects.length} subject · ${model.chapters.length} chapters · ${model.topics.length} topics · ${model.knowledgeUnits.length} knowledge units · ${model.pyqs.length} sample PYQs`);
console.log("  variable-shape fixture: 15 chapters · 30 topics in one chapter · zero-subtopic topics accepted");
console.log("  routes, responsive layers, interaction hooks and offline precache are wired");
