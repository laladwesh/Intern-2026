// Programme list from the placement portal DB (placement24db.programmes collection)
// ObjectId _id values must match so records can be migrated / referenced later.
export const PG_PROGRAMMES = [
  // // ── B.Tech ──────────────────────────────────────────────────────────────────
  // { _id: "66c99ddfc69f86204658e8b5", displayName: "B.Tech - Computer Science and Engineering" },
  // { _id: "66cc1332c69f8620465903de", displayName: "B.Tech - Engineering Physics" },
  // { _id: "66cc1332c69f8620465903ed", displayName: "B.Tech - Electronics and Communication Engineering" },
  // { _id: "66cc13c7eddc9e2d18205dc4", displayName: "B.Tech - Mechanical Engineering" },
  // { _id: "66cc13c8eddc9e2d18205e46", displayName: "B.Tech - Civil Engineering" },
  // { _id: "66cc13c8eddc9e2d18205ebc", displayName: "B.Tech - Biosciences and Bioengineering" },
  // { _id: "66cc13c8eddc9e2d18205f06", displayName: "B.Tech - Chemical Engineering" },
  // { _id: "66cc13c8eddc9e2d18205f7c", displayName: "B.Tech - Electronics and Electrical Engineering" },
  // { _id: "66cc15ec32d095c816f9c487", displayName: "B.Tech - Chemical Science and Technology" },
  // { _id: "66cc15ec32d095c816f9c4c5", displayName: "B.Tech - Mathematics and Computing" },
  // { _id: "66cc15ec32d095c816f9c52c", displayName: "B.Tech - Data Science and Artificial Intelligence" },
  // { _id: "68cd800eaf644e090790f649", displayName: "B.Tech - Energy Engineering" },
  // { _id: "66cc1332c69f8620465903ed", displayName: "B.Tech - Electronics and Communication Engineering" },
  // { _id: "66cc1332c69f862046590403", displayName: "B.Tech - Robotics and Artificial Intelligence (minor)" },
  // { _id: "66cc1332c69f86204659041a", displayName: "B.Tech - Product Design (minor)" },
  // { _id: "66cc13c8eddc9e2d18205f0d", displayName: "B.Tech - Language and Literature (minor)" },

  // // ── B.Des ────────────────────────────────────────────────────────────────────
  // { _id: "66cc15ec32d095c816f9c548", displayName: "B.Des - Design" },

  // ── M.Tech ───────────────────────────────────────────────────────────────────
  { _id: "66cc34cc32d095c816f9ce56", displayName: "M.Tech - Computer Science and Engineering" },
  { _id: "66cc34cc32d095c816f9ce92", displayName: "M.Tech - Communication Engineering" },
  { _id: "66cc34cc32d095c816f9cea2", displayName: "M.Tech - Power Engineering" },
  { _id: "66cc34cc32d095c816f9ceac", displayName: "M.Tech - Microelectronics, Photonics & RF Engineering" },
  { _id: "66cc34cc32d095c816f9ceb6", displayName: "M.Tech - Signal Processing and Machine Learning" },
  { _id: "66cc34cc32d095c816f9cec7", displayName: "M.Tech - VLSI and Nanoelectronics" },
  { _id: "66cc34cc32d095c816f9ced8", displayName: "M.Tech - Systems, Control and Automation" },
  { _id: "66cc34cc32d095c816f9cedf", displayName: "M.Tech - Aerodynamics and Propulsion" },
  { _id: "66cc34cc32d095c816f9ceeb", displayName: "M.Tech - Computational Mechanics" },
  { _id: "66cc34cc32d095c816f9cef7", displayName: "M.Tech - Manufacturing Science and Engineering" },
  { _id: "66cc34cc32d095c816f9cf15", displayName: "M.Tech - Fluids and Thermal Engineering" },
  { _id: "66cc34cc32d095c816f9cf34", displayName: "M.Tech - Machine Design" },
  { _id: "66cc34cc32d095c816f9cf5f", displayName: "M.Tech - Earth System Science and Engineering" },
  { _id: "66cc34cc32d095c816f9cf6b", displayName: "M.Tech - Environmental Engineering" },
  { _id: "66cc34cc32d095c816f9cf80", displayName: "M.Tech - Geotechnical Engineering" },
  { _id: "66cc34cc32d095c816f9cf98", displayName: "M.Tech - Infrastructure Engineering and Management" },
  { _id: "66cc34cc32d095c816f9cfa2", displayName: "M.Tech - Structural Engineering" },
  { _id: "66cc34cc32d095c816f9cfd7", displayName: "M.Tech - Water Resources Engineering and Management" },
  { _id: "66cc34cc32d095c816f9cfec", displayName: "M.Tech - Biotechnology" },
  { _id: "66cc34cc32d095c816f9d016", displayName: "M.Tech - Materials Science and Technology" },
  { _id: "66cc34cc32d095c816f9d025", displayName: "M.Tech - Petroleum Science and Technology" },
  { _id: "66cc34cd32d095c816f9d03e", displayName: "M.Tech - Computer Aided Process Engineering" },
  { _id: "66cc34cd32d095c816f9d047", displayName: "M.Tech - Bioengineering" },
  { _id: "66cc34cd32d095c816f9d052", displayName: "M.Tech - Rural Technology" },
  { _id: "66cc34cd32d095c816f9d057", displayName: "M.Tech - Robotics and Artificial Intelligence" },
  { _id: "66cc34cd32d095c816f9d078", displayName: "M.Tech - Medical Devices and Diagnostics" },
  { _id: "66cc34cd32d095c816f9d08b", displayName: "M.Tech - Regenerative Medicines, Stem Cells and Therapeutics" },
  { _id: "66cc34cd32d095c816f9d095", displayName: "M.Tech - Data Science" },
  { _id: "66cc34cd32d095c816f9d0a9", displayName: "M.Tech - Food Science & Technology" },
  { _id: "68cd3086af644e090790419d", displayName: "M.Tech - Transportation Systems Engineering" },
  { _id: "68cd3086af644e090790425c", displayName: "M.Tech - Food Science and Technology" },

  // ── M.Des ────────────────────────────────────────────────────────────────────
  { _id: "66cc34cd32d095c816f9d0b3", displayName: "M.Des - Design" },
  { _id: "66cc34cd32d095c816f9d0d5", displayName: "M.Des - Electronic Product Design" },

  // ── MSR ─────────────────────────────────────────────────────────────────────
  { _id: "66cc34cd32d095c816f9d0f0", displayName: "MSR - Energy Science and Engineering" },
  { _id: "66cc34cd32d095c816f9d0fe", displayName: "MSR - Disaster Management and Risk Reduction" },
  { _id: "66cc34cd32d095c816f9d105", displayName: "MSR - E Mobility" },
  { _id: "68cd3086af644e09079042a3", displayName: "MSR - Polymer Science and Technology" },
  { _id: "68d3a583af644e0907aba506", displayName: "MSR - Electronics and Electrical Engineering" },

  // ── MA ──────────────────────────────────────────────────────────────────────
  { _id: "66cc459732d095c816f9d4a2", displayName: "MA - Development Studies" },
  { _id: "66cc459732d095c816f9d4cc", displayName: "MA - Liberal Arts" },

  // ── MSc ─────────────────────────────────────────────────────────────────────
  { _id: "66cc471232d095c816f9d514", displayName: "MSc - Chemistry" },
  { _id: "66cc471232d095c816f9d54c", displayName: "MSc - Mathematics and Computing" },
  { _id: "66cc471232d095c816f9d581", displayName: "MSc - Physics" },
  { _id: "66cc49e732d095c816f9d97c", displayName: "MSc - Mathematics" },

  // ── MBA ─────────────────────────────────────────────────────────────────────
  { _id: "68c947582a3382062b3b0b2f", displayName: "MBA - School of Business" },
];

// Grouped for <optgroup> rendering
export const PG_PROGRAMMES_GROUPED = [
  // {
  //   group: "B.Tech",
  //   programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("B.Tech")),
  // },
  // {
  //   group: "B.Des",
  //   programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("B.Des")),
  // },
  {
    group: "M.Tech",
    programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("M.Tech")),
  },
  {
    group: "M.Des",
    programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("M.Des")),
  },
  {
    group: "MSR",
    programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("MSR")),
  },
  {
    group: "MA",
    programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("MA")),
  },
  {
    group: "MSc",
    programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("MSc")),
  },
  {
    group: "MBA",
    programmes: PG_PROGRAMMES.filter((p) => p.displayName.startsWith("MBA")),
  },
];

/** Return displayName for a given ObjectId string, or the raw id if not found */
export const getProgrammeDisplay = (id) => {
  if (!id) return "—";
  const found = PG_PROGRAMMES.find((p) => p._id === String(id));
  return found ? found.displayName : String(id);
};
