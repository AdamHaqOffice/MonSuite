import {
  canadaJurisdictionNotes,
  jobRules,
  powerOptions,
  scrubberProducts,
  statePlanNotes,
} from '../data/scrubberSelectorData.js';

const METERS_TO_FEET = 3.28084;

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeProjectType(projectType) {
  if (projectType === 'healthcare_positive_pressure') return 'operating_room_clean_space';
  if (projectType === 'general_construction_dust') return 'lead_demolition';
  return projectType || 'unknown';
}

function countryKey(input) {
  return input.country === 'Canada' ? 'Canada' : 'US';
}

export function getBaseJobRule(input) {
  const key = countryKey(input);
  const ruleKey = normalizeProjectType(input.projectType);
  return jobRules[key]?.[ruleKey] || jobRules[key]?.unknown || jobRules.US.unknown;
}

function getProjectDefaults(input) {
  const base = { ...getBaseJobRule(input) };
  const canada = input.country === 'Canada';

  switch (input.projectType) {
    case 'healthcare_positive_pressure':
      return {
        ...base,
        name: canada ? 'Canada healthcare positive pressure / clean space protection' : 'US healthcare positive pressure / clean space protection',
        targetAch: 12,
        pressureDirection: 'Positive/protective unless project states otherwise',
        targetPressure: 'Facility/project-specific positive pressure target',
        filter: 'HEPA or facility-specified filtration',
        monitorRequired: true,
        alarmRecommended: true,
        loggingRequired: true,
        documentationRequired: true,
        note: 'Protective spaces such as OR support, sterile storage, clean rooms, and protective environments usually require a verified positive pressure relationship. Confirm final requirements with facility engineering, infection prevention/control, project specification, and AHJ.',
      };
    case 'general_construction_dust':
      return {
        ...base,
        name: canada ? 'Canada general construction dust containment' : 'US general construction dust containment',
        targetAch: 6,
        pressureDirection: 'Negative if adjacent occupied/clean areas exist',
        targetPressure: 'Project-specific; estimating fallback -5 Pa if negative containment is selected',
        filter: 'HEPA recommended',
        monitorRequired: false,
        documentationRequired: true,
        note: 'General construction containment is driven by the space, adjacent occupancy, project specification, and whether negative pressure is being claimed. If there is no pressure goal, this is an air cleaning estimate only.',
      };
    case 'mold':
      return {
        ...base,
        targetAch: 8,
        targetPressure: 'Project/consultant specific; estimating fallback -5 Pa if negative containment is selected',
        filter: 'HEPA recommended/required when containment is used',
        documentationRequired: true,
      };
    default:
      return base;
  }
}

function applyHazardOverrides(rule, input) {
  const next = { ...rule };
  const warnings = [];

  switch (input.hazard) {
    case 'airborne_infection':
      next.targetAch = Math.max(next.targetAch || 0, 12);
      next.filter = 'HEPA required/recommended strongly';
      next.monitorRequired = true;
      next.alarmRecommended = true;
      next.loggingRequired = true;
      warnings.push('Airborne infection selections should be confirmed with facility infection prevention/control and project specifications.');
      break;
    case 'asbestos':
      next.targetAch = Math.max(next.targetAch || 0, 4);
      next.pressureDirection = 'Negative';
      next.targetPressure = '-5.0 Pa / -0.02 in. w.g. estimating default unless project/AHJ specifies otherwise';
      next.filter = 'HEPA required';
      next.monitorRequired = true;
      next.loggingRequired = true;
      warnings.push('Asbestos work is regulated. Scrubber sizing does not prove exposure compliance or replace licensed/qualified procedures.');
      break;
    case 'mold_spores':
      next.filter = 'HEPA recommended/required when containment is used';
      if (goalImpliesPressure(input)) next.monitorRequired = true;
      warnings.push('Mold containment and clearance requirements should be confirmed with the consultant, hygienist, insurer, or project protocol.');
      break;
    case 'silica_dust':
      next.filter = 'HEPA recommended for dust control/containment';
      if (goalImpliesPressure(input)) next.monitorRequired = true;
      warnings.push('Silica exposure compliance is separate from scrubber sizing and may require Table 1 controls, objective data, or personal exposure monitoring.');
      break;
    case 'lead_dust':
      next.filter = 'HEPA recommended for lead/demolition dust';
      if (goalImpliesPressure(input)) next.monitorRequired = true;
      warnings.push('Lead/demolition dust exposure compliance is separate from scrubber sizing and may require regulated work practices and exposure assessment.');
      break;
    case 'odor_voc':
      next.filter = 'Carbon/VOC filter option recommended; HEPA alone is not enough for gases/odors/VOCs';
      warnings.push('HEPA filters capture particles, not gases/odors/VOCs. Use a carbon/VOC option and confirm filter capacity/dwell time before making removal claims.');
      break;
    case 'smoke':
      next.filter = 'HEPA recommended for smoke particulate; carbon may be recommended for odor/gas component';
      warnings.push('Smoke includes particulate and odor/gas components. HEPA helps particles; carbon may be needed for odor/gas support.');
      break;
    case 'construction_dust':
    case 'general_particulate':
      next.filter = 'HEPA recommended';
      if (goalImpliesPressure(input)) next.monitorRequired = true;
      break;
    default:
      if (isHealthcareOrContainment(input)) next.monitorRequired = true;
      next.filter = next.filter || 'HEPA recommended for particulate hazards';
      break;
  }

  return { rule: next, hazardWarnings: warnings };
}

function goalImpliesPressure(input) {
  return ['negative_pressure', 'positive_pressure', 'clean_air_negative_pressure', 'clean_air_positive_pressure'].includes(input.primaryGoal)
    || ['negative_pressure', 'positive_pressure'].includes(input.pressureMode);
}

function isHealthcareOrContainment(input) {
  return ['hospital_airborne_isolation', 'hospital_construction', 'healthcare_positive_pressure', 'asbestos', 'mold', 'general_construction_dust'].includes(input.projectType);
}

function applyGoalOverrides(rule, input) {
  const next = { ...rule };
  const warnings = [];

  switch (input.primaryGoal) {
    case 'clean_air':
      if (!next.monitorRequired && !isHealthcareOrContainment(input)) next.monitorRequired = false;
      next.scrubberMode = 'Recirculation / room air cleaning';
      warnings.push('Recirculating air cleaning improves filtered airflow/ACH but does not create or prove a containment pressure relationship by itself.');
      break;
    case 'negative_pressure':
      next.pressureDirection = 'Negative';
      next.monitorRequired = true;
      next.scrubberMode = 'Exhaust out of containment / negative pressure setup';
      warnings.push('Negative pressure must be verified in the field with a calibrated pressure monitor. Airflow calculations alone do not prove pressure.');
      break;
    case 'positive_pressure':
      next.pressureDirection = 'Positive';
      next.monitorRequired = true;
      next.scrubberMode = 'Filtered supply into protected space / positive pressure support';
      warnings.push('Positive pressure must be verified in the field. Confirm the selected scrubber configuration is appropriate for supplying filtered air into the protected area.');
      break;
    case 'clean_air_negative_pressure':
      next.pressureDirection = 'Negative';
      next.monitorRequired = true;
      next.scrubberMode = 'Clean air support plus negative pressure containment';
      warnings.push('Calculate ACH and verify pressure separately. A scrubber can create airflow, but a pressure monitor proves the pressure relationship.');
      break;
    case 'clean_air_positive_pressure':
      next.pressureDirection = 'Positive';
      next.monitorRequired = true;
      next.scrubberMode = 'Clean air support plus positive pressure protection';
      warnings.push('Calculate ACH and verify positive pressure separately. Confirm setup with facility engineering and project specifications.');
      break;
    default:
      if (isHealthcareOrContainment(input)) {
        next.monitorRequired = true;
        warnings.push('Goal is not sure. Because this appears to involve healthcare, abatement, or containment, pressure monitoring is recommended until the project team confirms otherwise.');
      }
      next.scrubberMode = 'Inferred from project type/hazard';
      break;
  }

  return { rule: next, goalWarnings: warnings };
}

export function getRuleSet(input) {
  const projectBase = getProjectDefaults(input);
  const hazardApplied = applyHazardOverrides(projectBase, input);
  const goalApplied = applyGoalOverrides(hazardApplied.rule, input);
  return {
    ...goalApplied.rule,
    selectedProjectType: input.projectType,
    selectedHazard: input.hazard,
    selectedGoal: input.primaryGoal,
    contextWarnings: [...hazardApplied.hazardWarnings, ...goalApplied.goalWarnings],
  };
}

export function getJobRule(input) {
  return getRuleSet(input);
}

export function getJurisdictionNote(input) {
  if (input.country === 'Canada') {
    return canadaJurisdictionNotes[input.stateProvince] || 'Use Canadian healthcare/abatement defaults and verify provincial/territorial requirements, facility rules, project specifications, and AHJ direction.';
  }
  if (input.country === 'Other') {
    return 'Location is outside the starter US/Canada rule set. Use this as a conservative airflow estimate only and verify all local codes, project specifications, and authority-having-jurisdiction requirements.';
  }
  return statePlanNotes[input.stateProvince] || 'Use federal OSHA baseline plus CDC/ASHRAE/FGI/facility/project specifications. Verify state/local requirements and AHJ direction.';
}

export function classifyDuctProfile(input) {
  const ductLength = numberOrNull(input.ductLength) || 0;
  const bends = numberOrNull(input.ductBends) || 0;
  const ductType = input.ductType || 'unknown';
  const exhaustSetup = input.exhaustSetup || 'unknown';

  if (exhaustSetup === 'recirculate' || input.hasDucting === 'no') return 'none';
  if (ductLength >= 50 || bends >= 4 || ductType === 'flex' || ductType === 'flexible') return 'long';
  if (ductLength > 0 && ductLength <= 15 && bends <= 1) return 'short';
  return 'normal';
}

export function chooseDeratingFactor(ductProfile, filterLoading = 'normal') {
  if (filterLoading === 'heavy') return 0.6;
  if (ductProfile === 'none') return 0.9;
  if (ductProfile === 'short') return 0.8;
  if (ductProfile === 'long') return 0.6;
  return 0.7;
}

export function chooseSafetyFactor(input, rule, ductProfile) {
  if (ductProfile === 'long') return 1.5;
  if (input.patientOccupiedAdjacent === 'yes' || input.occupiedAdjacentArea === 'yes') return 1.35;
  if (['hospital_airborne_isolation', 'hospital_construction', 'healthcare_positive_pressure', 'asbestos'].includes(input.projectType)) return 1.25;
  if (rule?.monitorRequired || goalImpliesPressure(input)) return 1.25;
  if (ductProfile === 'none' && input.projectType === 'general_air_cleaning') return 1.1;
  return 1.25;
}

export function getMonitorRequirement(input, rule) {
  if (['hospital_airborne_isolation', 'hospital_construction', 'healthcare_positive_pressure', 'asbestos'].includes(input.projectType)) return 'required_or_strongly_recommended';
  if (goalImpliesPressure(input)) return 'required_or_strongly_recommended';
  if (input.setup?.includes('negative') || input.setup?.includes('positive')) return 'required_or_strongly_recommended';
  if (input.hazard === 'asbestos') return 'required_or_strongly_recommended';
  if (['mold_spores', 'silica_dust', 'lead_dust'].includes(input.hazard) && goalImpliesPressure(input)) return 'recommended';
  if (input.needDocumentation === 'yes' || input.needLogsReports === 'yes') return 'recommended';
  if (rule?.monitorRequired) return 'required_or_strongly_recommended';
  return 'optional';
}

export function monitorLabel(requirement) {
  if (requirement === 'required_or_strongly_recommended') {
    return 'Pressure monitor recommended/required for this use case. Confirm final requirement with project spec/AHJ.';
  }
  if (requirement === 'recommended') {
    return 'Pressure monitor recommended if pressure control or documentation is expected.';
  }
  return 'Pressure monitor optional for recirculating air cleaning only.';
}

export function pressureMonitoringRequired(input, rule) {
  return getMonitorRequirement(input, rule) !== 'optional';
}

function requiresCarbon(input, rule) {
  return input.hazard === 'odor_voc' || input.projectType === 'odor_voc' || rule?.filter?.toLowerCase().includes('carbon');
}

export function productCompatible(product, input, rule) {
  if (!product.isRealProduct) return false;
  if (product.id === 'abatement_hc800fd_series') return false; // V37 planner core quote lineup uses five scrubbers: PRED750, BD2K, H2KM, PAS2400, PAS5000.
  if (requiresCarbon(input, rule) && !product.filtration?.carbonOption) return false;
  if (rule?.filter?.toLowerCase().includes('hepa') && !product.filtration?.hepa) return false;
  if (input.hazard === 'asbestos' && product.appLogic?.useForAsbestos === false) return false;
  if (input.hazard === 'silica_dust' && product.appLogic?.useForSilica === false) return false;
  if (input.hazard === 'mold_spores' && product.appLogic?.useForMold === false) return false;
  if (['hospital_airborne_isolation', 'hospital_construction', 'healthcare_positive_pressure'].includes(input.projectType) && product.appLogic?.useForHealthcare === false) return false;

  const voltage = product.electrical?.voltageVac || 120;
  if (['120v15a', '120v20a'].includes(input.powerAvailable) && voltage > 130) return false;
  if (input.powerAvailable === '240v' && voltage <= 130 && input.projectType === 'general_air_cleaning' && product.airflow?.appDefaultCfm < 1000) return false;

  return true;
}

function designCfmClass(designCfm) {
  if (designCfm <= 650) return 'small';
  if (designCfm <= 1400) return 'medium';
  if (designCfm <= 2600) return 'large120';
  return 'veryLarge';
}

function applicationFitScore(product, input, designCfm) {
  const productId = product.id;
  const cfmClass = designCfmClass(designCfm);
  let score = 0;

  if (cfmClass === 'small') {
    if (productId === 'abatement_pred750') score += 170;
    if (productId === 'abatement_hc800fd_series') score += 150;
    if (productId === 'abatement_pas5000') score -= 300;
  } else if (cfmClass === 'medium') {
    if (productId === 'abatement_h2km_h2kma' || productId === 'abatement_bd2k_xhp_xhpa') score += 130;
    if (productId === 'abatement_pas2400') score += 90;
    if (productId === 'abatement_pred750') score -= 40;
    if (productId === 'abatement_pas5000') score -= 220;
  } else if (cfmClass === 'large120') {
    if (productId === 'abatement_pas2400') score += 160;
    if (productId === 'abatement_h2km_h2kma' || productId === 'abatement_bd2k_xhp_xhpa') score += 110;
    if (productId === 'abatement_pas5000') score -= input.powerAvailable === '240v' || input.powerAvailable === 'multiple' ? 10 : 180;
    if (productId === 'abatement_pred750' || productId === 'abatement_hc800fd_series') score -= 120;
  } else {
    if (productId === 'abatement_pas5000' && ['240v', 'multiple', 'unknown'].includes(input.powerAvailable)) score += 260;
    if (productId === 'abatement_pas2400') score += 120;
    if (productId === 'abatement_h2km_h2kma' || productId === 'abatement_bd2k_xhp_xhpa') score += 80;
    if (productId === 'abatement_pred750' || productId === 'abatement_hc800fd_series') score -= 220;
  }

  if (['hospital_airborne_isolation', 'healthcare_positive_pressure'].includes(input.projectType)) {
    if (productId === 'abatement_hc800fd_series') score += designCfm <= 1500 ? 460 : 180;
    if (productId === 'abatement_pred750') score += designCfm <= 700 ? 95 : 25;
    if ((productId === 'abatement_h2km_h2kma' || productId === 'abatement_bd2k_xhp_xhpa') && designCfm <= 1500) score -= 80;
    if (productId === 'abatement_pas2400' && designCfm <= 1500) score -= 70;
    if (productId === 'abatement_pas5000') score -= 240;
  }

  if (input.projectType === 'hospital_construction') {
    if (productId === 'abatement_h2km_h2kma') score += 130;
    if (productId === 'abatement_pas2400') score += 120;
    if (productId === 'abatement_bd2k_xhp_xhpa') score += 70;
    if (productId === 'abatement_hc800fd_series') score += 40;
  }

  if (['asbestos', 'silica', 'general_construction_dust'].includes(input.projectType) || ['asbestos', 'silica_dust', 'lead_dust', 'construction_dust'].includes(input.hazard)) {
    if (productId === 'abatement_h2km_h2kma') score += 130;
    if (productId === 'abatement_bd2k_xhp_xhpa') score += 100;
    if (productId === 'abatement_pas2400') score += 120;
    if (productId === 'abatement_pas5000' && designCfm > 2200) score += 180;
    if (productId === 'abatement_hc800fd_series') score -= 120;
  }

  if (input.projectType === 'mold' || input.hazard === 'mold_spores') {
    if (productId === 'abatement_bd2k_xhp_xhpa') score += 170;
    if (productId === 'abatement_pred750') score += 80;
    if (productId === 'abatement_h2km_h2kma') score += 45;
  }

  if (input.projectType === 'odor_voc' || input.hazard === 'odor_voc') {
    if (product.filtration?.carbonOption) score += 100;
    if (productId === 'abatement_hc800fd_series' || productId === 'abatement_pred750') score += 70;
  }

  return score;
}

function siteFitScore(product, input) {
  const env = input.siteEnvironment || 'commercial_industrial';
  let score = 0;
  const preferred = product.appLogic?.preferredSiteEnvironments || [];
  const avoid = product.appLogic?.avoidSiteEnvironments || [];

  if (preferred.includes(env)) score += 180;
  if (avoid.includes(env)) score -= 240;

  if (env === 'residential_finished' || env === 'wet_damp_restoration') {
    if (product.id === 'abatement_bd2k_xhp_xhpa') score += 260;
    if (product.id === 'abatement_pred750') score += 130;
    if (product.id === 'abatement_hc800fd_series') score += 80;
    if (product.id === 'abatement_h2km_h2kma') score -= 180;
    if (product.id === 'abatement_pas5000') score -= 320;
  }

  if (env === 'commercial_industrial') {
    if (product.id === 'abatement_h2km_h2kma') score += 135;
    if (product.id === 'abatement_pas2400') score += 80;
    if (product.id === 'abatement_bd2k_xhp_xhpa') score -= 25;
  }

  if (env === 'healthcare_construction') {
    if (product.id === 'abatement_hc800fd_series') score += 150;
    if (product.id === 'abatement_h2km_h2kma') score += 110;
    if (product.id === 'abatement_pas2400') score += 80;
  }

  if (env === 'tight_access_stairs') {
    if (product.id === 'abatement_pas2400') score += 230;
    if (product.id === 'abatement_pred750') score += 80;
    if (product.id === 'abatement_pas5000') score -= 360;
  }

  if (env === 'large_containment') {
    if (product.id === 'abatement_pas5000') score += 280;
    if (product.id === 'abatement_pas2400') score += 130;
    if (product.id === 'abatement_pred750') score -= 240;
  }

  return score;
}

function scoreRecommendation(rec, input, designCfm) {
  let score = rec.meetsTarget ? 1000 : -500;
  const margin = rec.estimatedAch / Math.max(rec.targetAch, 1);
  const overSizedPenalty = margin > 2.75 ? (margin - 2.75) * 90 : 0;

  score += applicationFitScore(rec.product, input, designCfm);
  score += siteFitScore(rec.product, input);
  score -= rec.quantity * 28;
  score -= rec.totalAmps * 2.4;
  score -= overSizedPenalty;

  if (margin >= 1 && margin <= 1.75) score += 180;
  if (margin > 1.75 && margin <= 2.75) score += 95;
  if (rec.quantity === 1) score += 55;

  const voltage = rec.product.electrical?.voltageVac || 120;
  if (voltage > 130 && input.powerAvailable === 'unknown') score -= 240;
  if (voltage > 130 && input.powerAvailable === '240v') score += 140;
  if (voltage > 130 && input.powerAvailable === 'multiple') score += 80;
  if (voltage <= 130 && ['120v15a', '120v20a', 'unknown', 'multiple'].includes(input.powerAvailable)) score += 40;

  switch (input.budgetPriority) {
    case 'fewest_machines': score -= rec.quantity * 70; break;
    case 'lowest_electrical_load': score -= rec.totalAmps * 14; break;
    case 'quietest': score -= (rec.product.physical?.soundMax || 70) * 5; break;
    case 'most_conservative': score += Math.min(margin, 2.2) * 100; break;
    case 'smallest_footprint': score -= rec.quantity * (rec.product.physical?.weightLb || 80) * 0.4; break;
    case 'best_fit':
    default:
      score += rec.product.productTier === 'healthcare' && ['hospital_airborne_isolation', 'healthcare_positive_pressure'].includes(input.projectType) ? 80 : 0;
      break;
  }

  return score;
}

function toFeet(value, unitSystem) {
  const n = numberOrNull(value);
  if (!n) return null;
  return unitSystem === 'meters' ? n * METERS_TO_FEET : n;
}

function roomCount(input) {
  return Math.max(1, Math.round(numberOrNull(input.roomCount) || 1));
}

export function getScrubberRecommendation(input) {
  const errors = [];
  const length = toFeet(input.length, input.unitSystem);
  const width = toFeet(input.width, input.unitSystem);
  const height = toFeet(input.height, input.unitSystem);
  const rooms = roomCount(input);

  if (!length) errors.push('Enter a valid room/containment length greater than 0.');
  if (!width) errors.push('Enter a valid room/containment width greater than 0.');
  if (!height) errors.push('Enter a valid ceiling height greater than 0.');
  if (!input.projectType) errors.push('Select a project type / compliance category.');
  if (!input.hazard) errors.push('Select a hazard / concern.');
  if (!input.primaryGoal) errors.push('Select a primary goal.');

  const rule = getRuleSet(input);
  const targetAch = numberOrNull(input.targetAch) || rule.targetAch || 6;
  const roomVolume = length && width && height ? length * width * height * rooms : 0;
  const ductProfile = classifyDuctProfile(input);
  const safetyFactor = chooseSafetyFactor(input, rule, ductProfile);
  const deratingFactor = chooseDeratingFactor(ductProfile, input.filterLoading || 'normal');
  const designAch = targetAch * safetyFactor;
  const requiredCfm = roomVolume ? (roomVolume * targetAch) / 60 : 0;
  const designCfm = roomVolume ? (roomVolume * designAch) / 60 : 0;
  const monitorRequirement = getMonitorRequirement(input, rule);
  const monitorRequired = monitorRequirement !== 'optional';
  const power = powerOptions.find((option) => option.id === input.powerAvailable) || powerOptions[0];

  const targetAchWarning = [];
  if (numberOrNull(input.targetAch) && numberOrNull(input.targetAch) < (rule.targetAch || 0)) {
    targetAchWarning.push(`Entered target ACH is below the common default for this selected project type/hazard (${rule.targetAch} ACH). Confirm with project specification/AHJ.`);
  }

  if (errors.length) {
    return {
      errors,
      rule,
      jurisdictionNote: getJurisdictionNote(input),
      recommendations: [],
      calculations: { roomVolume, targetAch, requiredCfm, designAch, designCfm, safetyFactor, deratingFactor },
      monitorRequirement,
      monitorLabel: monitorLabel(monitorRequirement),
      contextWarnings: rule.contextWarnings || [],
    };
  }

  const recommendations = scrubberProducts
    .filter((product) => productCompatible(product, input, rule))
    .map((product) => {
      const ratedCfm = product.airflow?.appDefaultCfm || product.airflow?.maxRatedCfm || 0;
      const effectiveCfm = ratedCfm * deratingFactor;
      const quantity = Math.max(1, Math.ceil(designCfm / Math.max(effectiveCfm, 1)));
      const totalEffectiveCfm = quantity * effectiveCfm;
      const estimatedAch = roomVolume ? (totalEffectiveCfm * 60) / roomVolume : 0;
      const totalAmps = quantity * (product.electrical?.normalOperatingAmpsMax || 0);
      const estimatedWatts = totalAmps * (power.volts || product.electrical?.voltageVac || 120);
      const warnings = [];

      if (power.planningLimitAmps && totalAmps > power.planningLimitAmps) {
        warnings.push(`Electrical load estimate is ${totalAmps.toFixed(1)}A, above the ${power.label} continuous planning limit of ${power.planningLimitAmps}A. Confirm multiple circuits or electrical plan.`);
      }
      if (!power.planningLimitAmps && input.powerAvailable === 'unknown') {
        warnings.push('Power availability is unknown. Confirm circuit availability before relying on this setup.');
      }
      if ((product.electrical?.voltageVac || 120) > 130 && input.powerAvailable === 'unknown') {
        warnings.push(`${product.displayName} requires ${product.electrical.voltageVac}V class power. Confirm the correct circuit before selecting it.`);
      }
      const siteEnvironment = input.siteEnvironment || 'commercial_industrial';
      if (product.appLogic?.preferredSiteEnvironments?.includes(siteEnvironment)) {
        warnings.push(`Site fit: ${product.displayName} is preferred for the selected environment.`);
      }
      if (product.appLogic?.avoidSiteEnvironments?.includes(siteEnvironment)) {
        warnings.push(`Site fit warning: ${product.displayName} is not the preferred cabinet style for this selected environment. Review product-fit guidance before quoting.`);
      }
      if (monitorRequired) warnings.push('Pressure must be verified with a calibrated pressure monitor; airflow alone does not prove negative/positive pressure.');
      if (requiresCarbon(input, rule) && !product.filtration?.carbonOption) warnings.push('This selection involves odor/VOC support but this product does not list a carbon option.');
      targetAchWarning.forEach((message) => warnings.push(message));
      (rule.contextWarnings || []).forEach((message) => warnings.push(message));
      product.warningMessages?.forEach((message) => warnings.push(message));

      const rec = {
        product,
        quantity,
        ratedCfm,
        effectiveCfm,
        totalEffectiveCfm,
        estimatedAch,
        totalAmps,
        estimatedWatts,
        targetAch,
        meetsTarget: estimatedAch >= targetAch,
        warnings,
        accessories: buildAccessories(input, rule, product, monitorRequirement),
      };
      rec.score = scoreRecommendation(rec, input, designCfm);
      return rec;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const topRecommendation = recommendations[0] || null;
  const salesAnswer = topRecommendation
    ? `${topRecommendation.quantity} × ${topRecommendation.product.shortName || topRecommendation.product.model} estimated for ${formatNumber(roomVolume, 0)} ft³ at ${formatNumber(targetAch, 1)} ACH target. ${monitorLabel(monitorRequirement)}`
    : 'No scrubber recommendation could be generated with the current inputs.';

  return {
    errors,
    salesAnswer,
    rule,
    jurisdictionNote: getJurisdictionNote(input),
    monitorRequired,
    monitorRequirement,
    monitorLabel: monitorLabel(monitorRequirement),
    contextWarnings: [...(rule.contextWarnings || []), ...targetAchWarning],
    calculations: {
      roomVolume,
      targetAch,
      requiredCfm,
      designAch,
      designCfm,
      safetyFactor,
      deratingFactor,
      ductProfile,
      targetPressure: input.targetPressure || rule.targetPressure,
      powerLabel: power.label,
      rooms,
      unitSystem: input.unitSystem || 'feet',
    },
    recommendations,
  };
}

function buildAccessories(input, rule, product, monitorRequirement) {
  const accessories = [];
  if (monitorRequirement === 'required_or_strongly_recommended') accessories.push('Continuous alarm/logging pressure monitor package');
  else if (monitorRequirement === 'recommended') accessories.push('Pressure monitor recommended for documentation or pressure-control verification');
  else accessories.push('Pressure monitor optional unless pressure containment is claimed');

  if (input.primaryGoal?.includes('negative') || input.exhaustSetup === 'outside') accessories.push(product.ducting?.outletSize ? `Ducting/exhaust collar: ${product.ducting.outletSize}` : 'Ducting and exhaust accessories as required');
  if (input.primaryGoal?.includes('positive')) accessories.push('Confirm filtered supply/positive-pressure configuration with manufacturer/facility engineering');
  if (input.hazard === 'odor_voc' || input.projectType === 'odor_voc') accessories.push(product.filtration?.carbonOption ? 'Carbon filter option for odor/VOC support' : 'Select a carbon-capable unit for odor/VOC support');
  if (rule?.loggingRequired || input.needDocumentation === 'yes') accessories.push('Pressure history/log export recommended for documentation');
  if (product.filtration?.hepa) accessories.push(`${product.filtration.hepaClass || 'HEPA'} filter setup`);
  return accessories;
}

export function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
