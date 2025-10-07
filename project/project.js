import { $setState } from "../vendor/vanjejs.module.js";

async function loadData() {
  const res = await fetch("./projects.json");
  if (!res.ok) throw new Error(`Failed to fetch data.json: ${res.status}`);
  return res.json();
}

async function init() {
  // Get the full URL query string (everything after ?)
  const params = new URLSearchParams(window.location.search);

  // Retrieve a specific parameter value, e.g. ?id=str
  const id = params.get("id");

  console.log(id); // outputs: "str"

  const jsonData = await loadData();

  if (jsonData[id] === undefined) {
    // Redirect to home page if id is invalid
    window.location.href = "/";
    return;
  }
  $setState("data", jsonData[id]);
  console.log(jsonData[id]);
}

window.onload = init;
