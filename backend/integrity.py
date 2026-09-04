"""The dataset's deliberate artefacts, and how each is handled.

DATA_DICTIONARY.md says these exist and that "a solution that handles them
gracefully is worth more than one that assumes perfect inputs". Each entry
below names the file and function that implements the handling, so the claim
is checkable rather than asserted.
"""

TRAPS = [
    {
        "trap": "Custody accounts",
        "naive": "17 mandate breaches",
        "ours": "14 breaches",
        "why": "Custody accounts are not managed by the bank and carry no mandate. Three portfolios excluded.",
        "where": "loader.managed_holdings · config.MANDATED_SERVICE_MODELS",
    },
    {
        "trap": "Concentration limits",
        "naive": "Flags index funds and government bonds",
        "ours": "Single-name only",
        "why": "The limit applies where concentration_limit_applies = Y, not to diversified funds, sovereigns or deposits.",
        "where": "detectors.suitability.detect",
    },
    {
        "trap": "FX convention",
        "naive": "Fees booked in JPY summed as USD",
        "ours": "Converted at the snapshot rate",
        "why": "USDJPY is JPY per USD; EURUSD is USD per EUR. Direction is checked before dividing.",
        "where": "loader.to_usd",
    },
    {
        "trap": "Bond quantity",
        "naive": "Values inflated 100x",
        "ours": "Supplied market values used directly",
        "why": "Bond quantity is in units of 100 nominal, so quantity x price already gives market value.",
        "where": "loader — market_value_* columns are not recomputed",
    },
    {
        "trap": "Stale valuation",
        "naive": "Reported as a data error",
        "ours": "Reported as an ageing mark",
        "why": "Private marks lag one quarter by design. The June review deliberately left the price unchanged.",
        "where": "detectors.monitor.detect",
    },
    {
        "trap": "Missing cost basis",
        "naive": "Estimates a gain",
        "ours": "Declines to advise",
        "why": "Tax lot history was not supplied on transfer. An estimated basis cannot be defended to the client.",
        "where": "detectors.suitability — no gain is computed without a cost basis",
    },
    {
        "trap": "Suitability waiver",
        "naive": "Reports a commodity breach",
        "ours": "Reports it as authorised",
        "why": "The client confirmed the instruction in writing. The waiver lives in the notes, so notes are read before flagging.",
        "where": "detectors.suitability.waivers · gate.apply",
    },
    {
        "trap": "Gated redemptions",
        "naive": "Treats gated assets as sellable",
        "ours": "Treats them as unavailable",
        "why": "A redemption request in the data was met at 22% when the manager applied a quarterly gate.",
        "where": "detectors.resilience.GATED_TIERS",
    },
]
