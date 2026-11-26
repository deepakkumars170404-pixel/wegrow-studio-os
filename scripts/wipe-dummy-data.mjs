import { createClient } from "@libsql/client";
import path from "node:path";

const client = createClient({
  url: "file:" + path.join(process.cwd(), "data", "wegrow.db").replace(/\\/g, "/"),
});

async function run() {
  console.log("Cleaning dummy test data...");
  await client.execute("DELETE FROM videos");
  await client.execute("DELETE FROM clients");
  await client.execute("DELETE FROM sqlite_sequence WHERE name IN ('videos', 'clients')");

  const vRes = await client.execute("SELECT COUNT(*) as c FROM videos");
  const cRes = await client.execute("SELECT COUNT(*) as c FROM clients");
  const uRes = await client.execute("SELECT id, name, email, role FROM users ORDER BY id ASC");

  console.log("✅ Videos Count:", vRes.rows[0].c);
  console.log("✅ Clients Count:", cRes.rows[0].c);
  console.log("✅ Real Staff Accounts Preserved (" + uRes.rows.length + " users):");
  uRes.rows.forEach((u) => console.log(`  - #${u.id} ${u.name} (${u.role}) <${u.email}>`));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
