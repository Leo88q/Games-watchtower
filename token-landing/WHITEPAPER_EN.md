# Watchtower Coin ($WTWR) — White Paper (draft v0.1)

> **Status: DRAFT, not for publication.** The structure follows Annex I of Regulation (EU) 2023/1114 (MiCA)
> for crypto-assets other than asset-referenced tokens or e-money tokens.
> Sections marked **[TO FILL]** require decisions by the founder and legal counsel. All figures are plans
> and match `token-landing/en.html`. This crypto-asset white paper has not been approved by any competent
> authority in any Member State of the European Union. The offeror of the crypto-asset is solely
> responsible for the content of this crypto-asset white paper (statement required by Art. 6(3) MiCA).
> The Russian version `WHITEPAPER_RU.md` is the working original; keep both in sync.

---

## Summary

- **What it is.** $WTWR is the utility token of Watchtower OS, the operating system of the Leo Games studio:
  game analytics, traffic generation, control of Web3 products, and launching new games.
- **Network.** Solana (SPL token), fixed supply of **1,000,000,000**, no further issuance
  (mint authority is revoked after minting).
- **Raise.** Two-round presale, target **$250,000**: 60M at $0.0025 and 25M at $0.004.
- **Rights.** $WTWR does **not** grant equity, dividends, shareholder votes, refunds
  or guaranteed income. It grants access to platform services, discounts, staking and Launchpad participation,
  and voting on ecosystem parameters.
- **Key risks.** Total loss of funds; games are in beta/alpha/prototype stages; the platform has no revenue
  as of the date of this document; mainnet contracts have not passed an external audit (see Part I).

---

## Part A. Offeror

| Field | Value |
|---|---|
| Name, legal form, address | **[TO FILL]** — legal entity not yet formed |
| Registration number, LEI | **[TO FILL]** |
| Contacts | **[TO FILL]** official e-mail, website, X |
| Management | **[TO FILL]** names and roles |
| Business activity | development of Solana games and the Watchtower OS platform |
| Financial condition, last 3 years | **[TO FILL]**; no revenue before the raise |

## Part B. Issuer (if different from the offeror)
**[TO FILL]** — by default the issuer is the offeror.

## Part C. Trading platform operator
Not applicable: trading is planned on Solana decentralised exchanges (DEX). Listing on
centralised exchanges (CASPs) is a separate decision with a separate notification.

## Part D. Project

### D.1 Problem
Every Web3 game builds analytics, traffic, security and economy from scratch. Small studios cannot
afford such a stack, and players see scattered tokens with no connection between them.

### D.2 Product: Watchtower OS

| Component | What it does | Stage as of this document |
|---|---|---|
| Ingestion & analytics | on-chain and off-chain events, deduplication, cursors, backfill, funnels, cross-game segments; every metric carries a quality flag `complete/partial/unavailable` | live (read-only) |
| Control | game parameters change only via proposals with two signatures and 2FA, audit log, emergency pause; the hub technically cannot sign a transaction (verified by `test:readonly`) | live |
| TalkChart | SEO and AI search, X/Twitter with Solana Blinks, short videos, TipLink onboarding; "post → game" click-through confirmation by click-id | code ready, not deployed to production |
| Launchpad | launching new games with raises in $WTWR | planned, 2027 |
| Compute Grid | own hardware: AI analytics, rendering, VR | fundraising |

### D.3 Ecosystem games

| Game | Genre | Token | NFT | Stage |
|---|---|---|---|---|
| ARES-1 "Potato Colony" | farming economy | $POTATO | Common / Rare / Epic modules; licences for SKR | beta |
| GutterCaps | collectible caps + PvP | $CG | caps, 10 collections | alpha |
| Age of Farming | farming and crafting | harvest token [TO FILL ticker] | land, tools | prototype |
| Neon Relay | racing | season token [TO FILL ticker] | cars, skins | prototype |

### D.4 Cross-game links
1. **$POTATO → Age of Farming:** potatoes are seed stock; AOF harvests upgrade ARES-1 fields.
2. **GutterCaps trophies:** Neon Relay wins and ARES-1 Epic modules unlock unique caps.
3. **Watchtower Passport:** a non-transferable NFT recording achievements across all games; raises the
   staking multiplier and grants early access.
4. **$WTWR buyback:** 40% of platform revenue goes to market buybacks; 50% of bought tokens are burned, 50% go to stakers.

### D.5 Roadmap

| Timing | Milestone |
|---|---|
| Q4 2026 | presale, audit of game contracts and CapsStake, TalkChart to production |
| Q1 2027 | ARES-1 and GutterCaps on mainnet, CapsStake season 1, $WTWR/USDC DEX pool |
| Q2–Q3 2027 | cross-game mechanics, Passport, AOF and Neon Relay on mainnet, Studio API, Launchpad (2 games) |
| Q4 2027 | Compute Grid operational, real-time AI analyst, VR prototype |
| 2028 | first VR game, NFTs portable between 2D and VR |

### D.6 Use of funds ($250,000)

| Item | % | Amount |
|---|---|---|
| Development (salaries, monthly) | 35 | $87,500 |
| Compute Grid — hardware | 20 | $50,000 |
| Security audits | 15 | $37,500 |
| DEX liquidity ($WTWR/USDC at the Round 2 price) | 15 | $37,500 |
| Marketing | 10 | $25,000 |
| Operating reserve (legal, infrastructure) | 5 | $12,500 |

Compute Grid hardware (estimates as of this document): analytics & AI GPU node $18,000; build and
render node $9,000; VR rig $6,000; storage and backups $5,000; Solana Seeker test farm $5,000; network,
UPS, 12-month colocation $7,000. Total $50,000. Every purchase is published in the inventory with the receipt
and the treasury transaction.

## Part E. Offer

| Parameter | Round 1 · Founders | Round 2 · Builders |
|---|---|---|
| Price | $0.0025 | $0.0040 |
| Volume | 60,000,000 $WTWR | 25,000,000 $WTWR |
| Amount | $150,000 | $100,000 |
| Unlock | 10% at TGE, 1-month cliff, 9 months linear | 15% at TGE, 6 months linear |
| Payment currency | USDC, SOL **[TO FILL]** | USDC, SOL |
| Min/max per participant | **[TO FILL]** | **[TO FILL]** |

- **Round dates:** **[TO FILL]**.
- **Soft cap and shortfall:** **[TO FILL]** minimum amount; on shortfall, refund to the originating address within
  **[TO FILL]** days. Required by Art. 10 MiCA.
- **Right of withdrawal (Art. 13 MiCA):** retail holders may withdraw within **14 calendar days** without
  giving reasons and without fees; refunds no later than 14 days after withdrawal.
- **Safeguarding of funds until the offer ends:** multisig **[TO FILL: scheme, signers]** or escrow with a
  licensed provider.
- **Restrictions:** the offer is not open to the United States or jurisdictions where it is prohibited; geo-block and
  self-declaration on participation.

## Part F. Crypto-asset

### F.1 Technical parameters
| Parameter | Value |
|---|---|
| Standard | SPL Token (Solana) |
| Supply | 1,000,000,000, fixed |
| Decimals | 9 **[TO FILL]** |
| Mint authority | revoked after minting |
| Freeze authority | not set |
| Mint address | **[TO FILL after minting]** |

### F.2 Distribution

| Allocation | % | Tokens | Unlock |
|---|---|---|---|
| Presale, Round 1 | 6 | 60,000,000 | 10% TGE, 1-month cliff, 9 months linear |
| Presale, Round 2 | 2.5 | 25,000,000 | 15% TGE, 6 months linear |
| DEX liquidity | 4 | 40,000,000 | pool locked for 12 months |
| CapsStake airdrop (GutterCaps) | 10 | 100,000,000 | 4 seasons × 25M |
| Player rewards | 20 | 200,000,000 | 4-year decreasing emission |
| Developer team | 15 | 150,000,000 | 12-month lock, then 24 months linear |
| Builders fund | 8 | 80,000,000 | grants after milestone acceptance |
| Treasury & Compute Grid | 19.5 | 195,000,000 | multisig, quarterly report |
| Launchpad & partners | 8 | 80,000,000 | per deal, with lock |
| Marketing & community | 7 | 70,000,000 | 12 months linear |
| **Total** | **100** | **1,000,000,000** | |

## Part G. Rights and obligations

**Grants:** payment for Watchtower services (Studio API, traffic, Launchpad) at a discount versus USDC;
staking participation; Launchpad sale priority for stakers; voting on ecosystem parameters
(staking weights, builders fund allocation) — not on management of the legal entity.

**Does not grant:** equity, dividends, rights to the offeror's revenue or assets, or any right to demand
buyback or refund (except the Art. 13 withdrawal right and shortfall refunds).

**Changes to rights:** only via holder vote and publication of an amended white paper.

### G.1 CapsStake (staking in GutterCaps)
- Accepts **$CG** (weight 1.2), **$POTATO** (weight 1.2), **SKR** (weight 0.8).
- Points = stake value in $ × weight × lock multiplier (1 · 1.5 for 30 d · 2.5 for 90 d · 4 for 180 d) ×
  gameplay bonus up to 1.25 (real play per Watchtower data).
- Cap: no more than 1% of season points per wallet. Founder Passport ×1.1, Compute Patron ×1.2.
- At season end, points convert into a $WTWR airdrop from the 25M pool.
- Staked tokens are returned after the lock ends; CapsStake pays no interest and does not
  rehypothecate deposits.

### G.2 Platform revenue and its distribution
Sources (as launched): Studio API subscriptions, 3–5% of Launchpad raises, 1% of in-game NFT
marketplace volume, TalkChart traffic campaigns for third parties, Compute Grid rental.
Distribution: 40% $WTWR buyback (½ burned, ½ to stakers), 20% developer pool, 40% treasury.
Buybacks are made only from revenue actually received; as of this document there is no revenue.

### G.3 Compute Patron
A voluntary contribution toward a specific hardware item via a separate public wallet. Grants a
non-transferable NFT and a ×1.2 CapsStake multiplier. **Not an investment**: grants no tokens, equity,
income or rights to the hardware.

## Part H. Technology
- Solana network; game and CapsStake programs — Anchor (Rust).
- Watchtower OS — Node.js, read-only with respect to the blockchain; unified event contract, data quality
  flags; automated check that no transactions are signed.
- TalkChart — Python exporter with click log, click-id conversion confirmation, honours DNT/GPC.
- Treasury key custody — multisig **[TO FILL: Squads, M-of-N scheme]**.

## Part I. Risks

**Project:** games may fail to attract players; timelines may slip; hardware costs depend on the
market; key people may leave.

**Technical:** smart contract bugs; as of this document mainnet contracts have not passed an external
audit; vulnerabilities in Solana and dependencies; key loss.

**Market:** high volatility; low liquidity after listing; selling pressure at unlocks;
buybacks do not work without revenue.

**Regulatory:** changes to MiCA and national rules; restrictions in certain countries; tax
consequences for the buyer.

**Most important:** the buyer may lose the entire amount.

## Part J. Climate and environmental impact (Art. 6(1)(j) MiCA)
Solana consensus is Proof of Stake. **[TO FILL]** energy consumption indicators per the methodology of
the EU delegated regulation on sustainability indicators (usually sourced from a network data provider). Own
Compute Grid hardware: **[TO FILL]** consumption estimate once the site is chosen.

---

## Appendix: what remains before publication
1. Form the legal entity; fill in Parts A and B.
2. Choose the notification jurisdiction and competent authority; notify at least 20 working days
   before publication (Art. 8 MiCA).
3. Decide dates, per-participant min/max, soft cap and refund procedure.
4. Set up the treasury multisig and publish the addresses.
5. Review Part G (rights) and marketing materials with counsel (Art. 7: consistency with the white paper).
6. Choose one raise: this presale **or** the "Ecosystem Share" NFT from `INVESTOR_LANDING_BRIEF.md` — not both.
