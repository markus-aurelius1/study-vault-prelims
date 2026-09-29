/* Study Vault v2 — representative Geography data for interface evaluation only.
   Every record is explicitly provisional; this file is not a source of canonical notes or PYQ claims. */
(function () {
  "use strict";
  const V2 = window.V2 = window.V2 || {};
  const topic = (id, chapterId, title, description, extra) => Object.assign({ id, chapterId, title, description: description || "", subtopics: [], knowledgeUnitIds: [], metadata: { mock: true } }, extra || {});

  V2.MOCK_DATA = {
    meta: { mock: true, label: "Interface sample — taxonomy and content are provisional" },
    subjects: [{
      id: "geography", name: "Geography", accent: "#2F6F68",
      chapters: [
        { id: "earth-system", subjectId: "geography", title: "Earth System & Physical Geography", description: "Earth processes, atmosphere, water and the physical systems that connect them.", order: 1, topics: [
          topic("earth-latitude-gravity", "earth-system", "Earth, Latitude & Gravity", "A compact demonstration of how shape, rotation and latitude change measurements on Earth.", {
            knowledgeUnitIds: ["ku-orientation", "ku-shape", "ku-weight", "ku-comparison", "ku-trap", "ku-figure", "ku-revision"],
            subtopics: [
              { id: "shape-and-measurement", topicId: "earth-latitude-gravity", title: "Shape, gravity & Earth measurements", knowledgeUnitIds: ["ku-shape", "ku-weight", "ku-comparison"], metadata: { mock: true } },
              { id: "latitude-effects", topicId: "earth-latitude-gravity", title: "Latitude, rotation & apparent weight", knowledgeUnitIds: ["ku-trap", "ku-figure"], metadata: { mock: true } }
            ], metadata: { mock: true, readingMinutes: 7, level: "Core" }
          }),
          topic("coordinates-time-motions", "earth-system", "Coordinates, Time & Earth Motions", "Latitude, longitude, local time and the motions used to locate events in space and time."),
          topic("geomorphology-tectonics", "earth-system", "Geomorphology & Tectonics", "How internal and surface processes shape landforms."),
          topic("atmosphere-weather-climate", "earth-system", "Atmosphere, Weather & Climate", "Radiation, circulation and the mechanisms behind weather and climate."),
          topic("hydrosphere-oceanography", "earth-system", "Hydrosphere & Oceanography", "Ocean properties, circulation and connected water systems.")
        ] },
        { id: "indian-physical", subjectId: "geography", title: "Indian Physical Geography", description: "India's physiography, drainage, climate, soils and vegetation.", order: 2, topics: [
          topic("india-physiography", "indian-physical", "Indian Physiography & Regional Divisions", "The large physical regions and the processes that formed them."),
          topic("india-drainage", "indian-physical", "Indian Drainage, Rivers & Water Systems", "River systems, basins and drainage relationships."),
          topic("india-climate-hazards", "indian-physical", "Indian Climate, Monsoon & Natural Hazards", "Monsoon mechanisms, rainfall and linked hazards."),
          topic("india-soils-vegetation", "indian-physical", "Indian Soils & Natural Vegetation", "Distribution, formation and ecological associations.")
        ] },
        { id: "economic-resource", subjectId: "geography", title: "Indian Economic & Resource Geography", description: "Resources, agriculture, industry and connectivity as spatial systems.", order: 3, topics: [
          topic("agriculture-regions", "economic-resource", "Agriculture, Crops & Regional Patterns", "Conditions, distributions and regional production patterns."),
          topic("minerals-energy", "economic-resource", "Minerals, Energy & Resource Distribution", "Where resources occur and why economic activity clusters around them."),
          topic("transport-connectivity-tourism", "economic-resource", "Transport, Connectivity & Tourism Across Long Regional Names", "A deliberately long title used to verify wrapping and navigation overflow.")
        ] },
        { id: "world-regional", subjectId: "geography", title: "World & Regional Geography", description: "Spatial relationships among regions, landforms, water bodies and resources.", order: 4, topics: [
          topic("world-borders", "world-regional", "Countries, Borders & Political Geography", "Countries and the geographic relationships between them."),
          topic("world-water-bodies", "world-regional", "World Landforms, Rivers & Water Bodies", "Major physical features and their regional context.")
        ] },
        { id: "human-population", subjectId: "geography", title: "Human & Population Geography", description: "Population, settlements and human regions.", order: 5, topics: [
          topic("population-settlements", "human-population", "Population, Settlements & Human Regions", "This sample intentionally has no subtopics, proving that the UI does not require them.")
        ] }
      ]
    }],
    knowledgeUnits: [
      { id: "ku-orientation", type: "introduction", heading: "Concept orientation", content: "Earth is not a perfect sphere. Its shape and rotation make latitude relevant to distance, gravity and apparent weight. This short sample demonstrates the v2 reader, not a finished knowledge unit.", priority: "core", freshness: { status: "sample" }, pyqIds: [] },
      { id: "ku-shape", type: "section", heading: "Shape of the Earth", content: "The Earth is slightly wider around the equator than from pole to pole. That difference is small at planetary scale, but it matters when comparing radius and gravity by latitude.", bullets: ["Equatorial radius is greater than polar radius.", "A point at the equator is farther from Earth's centre than a point at a pole.", "The description is about an oblate form, not a perfect sphere."], relations: [{ type: "supports", targetId: "ku-weight" }], pyqIds: ["mock-upsc-2023-42"] },
      { id: "ku-weight", type: "section", heading: "Why weight changes with latitude", content: "Apparent weight reflects both gravitational attraction and the rotational effect experienced at a latitude. Moving poleward reduces the rotational effect and also brings a point slightly closer to Earth's centre.", bullets: ["Rotation has its greatest outward effect at the equator.", "The rotational effect falls toward zero at the poles.", "Both effects make apparent weight greater toward the poles."], pyqIds: ["mock-uppcs-2021-18"] },
      { id: "ku-comparison", type: "comparison", heading: "Equator and poles compared", columns: ["Condition", "Equator", "Poles"], rows: [["Distance from centre", "Greater", "Smaller"], ["Rotational effect", "Greatest", "Zero"], ["Apparent weight", "Relatively lower", "Relatively higher"]], pyqIds: [] },
      { id: "ku-trap", type: "trap", heading: "Common reversal", content: "Do not reverse the relationship: greater equatorial radius does not make surface gravity stronger there. Distance from the centre and rotation both act in the other direction.", pyqIds: ["mock-upsc-2018-11"] },
      { id: "ku-figure", type: "figure", heading: "Latitude and rotation", content: "A deliberately simple schematic keeps the relationship visible without turning the reader into a dashboard.", diagram: "gravity", pyqIds: [] },
      { id: "ku-revision", type: "quickRevision", heading: "Quick revision", items: ["Earth is slightly wider at the equator.", "Rotation's outward effect is greatest at the equator and zero at the poles.", "Apparent weight increases from equator toward poles."], pyqIds: ["mock-upsc-2023-42", "mock-uppcs-2021-18"] }
    ],
    pyqs: [
      { id: "mock-upsc-2023-42", isMock: true, exam: "UPSC CSE", year: "2023", paper: "GS-I", questionNo: "42", question: "Demo question: Which statement best explains why apparent weight is lower near the equator than near the poles?", options: ["Only the atmosphere changes", "Rotation and the larger equatorial radius both contribute", "The equator is closer to Earth's centre", "Gravity is absent at the equator"], answer: "B — sample accepted answer", taxonomy: { subjectId: "geography", chapterId: "earth-system", topicId: "earth-latitude-gravity", subtopicIds: ["latitude-effects"] }, intelligence: { questionFormat: "Direct MCQ", temporalDependency: "Static", knowledgeDemanded: ["Relate latitude to rotational effect", "Relate Earth's shape to distance from its centre"], answerLogic: "The correct choice combines the two relevant mechanisms described in the demo knowledge units.", distractors: { A: "Introduces an unrelated cause.", C: "Reverses the radius relationship.", D: "Uses an absolute claim." }, trapTypes: ["Reversal", "Absolute claim"], relatedPyqIds: ["mock-uppcs-2021-18"] } },
      { id: "mock-uppcs-2021-18", isMock: true, exam: "UPPCS", year: "2021", paper: "GS-I", questionNo: "18", question: "Demo question: At which latitude is the rotational contribution to reduced apparent weight greatest?", options: ["0°", "30°", "60°", "90°"], answer: "A — sample accepted answer", taxonomy: { subjectId: "geography", chapterId: "earth-system", topicId: "earth-latitude-gravity", subtopicIds: ["latitude-effects"] }, intelligence: { questionFormat: "Direct MCQ", temporalDependency: "Static", knowledgeDemanded: ["Recognise where rotational speed is greatest"], answerLogic: "The equator is the location of the greatest rotational effect in this simplified comparison.", distractors: { B: "Intermediate latitude.", C: "Intermediate latitude.", D: "At the poles the rotational effect is zero." }, trapTypes: ["Latitude confusion"], relatedPyqIds: ["mock-upsc-2023-42"] } },
      { id: "mock-upsc-2018-11", isMock: true, exam: "UPSC CSE", year: "2018", paper: "GS-I", questionNo: "11", question: "Demo question: Consider two statements about Earth's equatorial radius and apparent weight.", options: ["Statement 1 only", "Statement 2 only", "Both statements", "Neither statement"], answer: "Sample answer withheld from ordinary view", taxonomy: { subjectId: "geography", chapterId: "earth-system", topicId: "earth-latitude-gravity", subtopicIds: ["shape-and-measurement"] }, intelligence: { questionFormat: "Statement based", temporalDependency: "Static", knowledgeDemanded: ["Keep radius and weight relationships distinct"], answerLogic: "The interface can hold statement-level reasoning without exposing it until requested.", distractors: {}, trapTypes: ["Reversal"], relatedPyqIds: ["mock-upsc-2023-42"] } }
    ]
  };
})();
