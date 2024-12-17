CREATE OR REPLACE VIEW ngc."ComputedResultsView" AS
SELECT id,
    date,
    "progression",
    "createdAt",
    "updatedAt",
    cast ("computedResults"->'carbone'->>'bilan' as float) as bilanCarbone,
	cast ("computedResults"->'carbone'->'categories'->>'transport' as float) as transportCarbone,
	cast ("computedResults"->'carbone'->'categories'->>'alimentation' as float) as alimentationCarbone,
	cast ("computedResults"->'carbone'->'categories'->>'logement' as float) as logementCarbone,
	cast ("computedResults"->'carbone'->'categories'->>'divers' as float) as diversCarbone,
    cast ("computedResults"->'eau'->>'bilan' as float) / 365 as bilanEauJour,
	cast ("computedResults"->'eau'->'categories'->>'transport' as float) / 365 as transportEauJour,
	cast ("computedResults"->'eau'->'categories'->>'alimentation' as float) / 365 as alimentationEauJour,
	cast ("computedResults"->'eau'->'categories'->>'logement' as float) / 365 as logementEauJour,
	cast ("computedResults"->'eau'->'categories'->>'divers' as float) / 365 as diversEauJour
FROM ngc."Simulation"