# 06 — Guided Traveller and Customer forms

**What to build:** A guest can enter every Traveller plus the paying Customer contact with guided document rules, readable validation, and Nigerian phone acceptance.

**Blocked by:** 05 — Fare confirmation step.

**Status:** ready-for-agent

- [ ] Each Traveller captures first name, last name, date of birth, gender, email, phone country code, phone, and Traveller type with party composition enforced
- [ ] Passport number, expiry, and nationality are required on international paths and hidden on domestic paths
- [ ] Date of birth hard-validates real non-future dates with soft warnings only for infant and child age bands
- [ ] Contact-is-first-Traveller is preselected with copy and Nigerian formats are accepted then normalized before submission
- [ ] Validation appears on blur and submit with human copy and no raw backend errors rendered
