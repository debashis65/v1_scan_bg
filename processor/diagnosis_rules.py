#!/usr/bin/env python3
"""
Diagnostic rule engine for orthotic recommendations based on foot analysis.
This implementation follows clinical guidelines for orthotic prescription.

Enhanced with:
- Intrinsic vs. extrinsic add-on categorization
- Confidence scores for recommendations
- Expanded pathology detection
- Support for patient-specific context
"""

from typing import Dict, List, Any, Tuple, Optional, Union


def apply_medical_rules(
    arch_type: str, 
    arch_degree: int, 
    alignment: Dict[str, str], 
    detected_pathologies: List[str],
    patient_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Apply medical rules to generate orthotic recommendations based on foot diagnosis.
    
    Args:
        arch_type: The type of arch ('Normal Arch', 'Flat Arch', 'High Arch')
        arch_degree: The degree of arch condition (1-4)
        alignment: Dictionary with alignment for each foot zone
        detected_pathologies: List of detected foot pathologies
        patient_context: Optional patient-specific context for personalized recommendations
        
    Returns:
        Dictionary with categorized recommendations, confidence scores, and flags
    """
    # Initialize recommendations structure
    recommendations = {
        "intrinsic": [],  # Inside the orthotic
        "extrinsic": [],  # Outside the orthotic (visible)
        "confidence_scores": {},  # Confidence score for each recommendation
        "flags": {},  # Flags for special considerations
        "primary_recommendations": [],  # Most important recommendations
        "secondary_recommendations": [],  # Supplementary recommendations
        "combined_list": []  # For backward compatibility
    }
    
    # Default confidence values for different condition types
    default_confidence = {
        "arch": 0.85,
        "alignment": 0.75,
        "pathology": 0.80,
        "other": 0.65
    }
    
    # Process patient context if provided
    patient_factors = {}
    if patient_context:
        patient_factors = {
            "age": patient_context.get("age", 30),
            "weight": patient_context.get("weight", 70),
            "activity_level": patient_context.get("activity_level", "moderate"),
            "medical_history": patient_context.get("medical_history", []),
            "previous_orthotics": patient_context.get("previous_orthotics", False)
        }
    
    # Flag for special cases
    flags = {}
    
    # Function to add a recommendation with metadata
    def add_recommendation(
        rec_name: str, 
        category: str = "intrinsic", 
        confidence: float = 0.8, 
        primary: bool = True,
        justification: str = ""
    ):
        if rec_name not in recommendations[category]:
            recommendations[category].append(rec_name)
            recommendations["confidence_scores"][rec_name] = confidence
            recommendations["combined_list"].append(rec_name)
            
            if primary:
                if rec_name not in recommendations["primary_recommendations"]:
                    recommendations["primary_recommendations"].append(rec_name)
            else:
                if rec_name not in recommendations["secondary_recommendations"]:
                    recommendations["secondary_recommendations"].append(rec_name)
    
    # Arch type based recommendations
    if arch_type == "Normal Arch":
        # For normal arches, minimal intervention unless other factors present
        if patient_context and patient_context.get("previous_foot_pain", False):
            add_recommendation("AS (Arch Support)", "intrinsic", 0.70, False, 
                              "Preventative support for prior pain with normal arch")
    
    elif arch_type == "Flat Arch":
        # For flat arches, support based on degree
        if arch_degree == 1:
            add_recommendation("AS (Arch Support)", "intrinsic", 0.75, True,
                              "Mild flat arch support")
        elif arch_degree == 2:
            add_recommendation("AS (Arch Support)", "intrinsic", 0.85, True,
                              "Moderate flat arch primary support")
            add_recommendation("MAS (Medial Arch Support)", "intrinsic", 0.80, True,
                              "Moderate flat arch medial reinforcement")
        elif arch_degree == 3:
            add_recommendation("MAS (Medial Arch Support)", "intrinsic", 0.90, True,
                              "Severe flat arch medial support")
            add_recommendation("NAS (Navicular Arch Support)", "intrinsic", 0.85, True,
                              "Navicular reinforcement for severe flat arch")
        elif arch_degree == 4:
            add_recommendation("MAS (Medial Arch Support)", "intrinsic", 0.95, True,
                              "Critical medial support for extreme flat arch")
            add_recommendation("NAS (Navicular Arch Support)", "intrinsic", 0.95, True,
                              "Critical navicular support for extreme flat arch")
            flags["severe_pes_planus"] = True
    
    elif arch_type == "High Arch":
        # For high arches, cushioning and support based on degree
        if arch_degree >= 2:
            add_recommendation("Soft Cushioning", "intrinsic", 0.80, True,
                              "Cushioning for moderate+ high arch")
        if arch_degree >= 3:
            add_recommendation("Heel Cushion Pad", "intrinsic", 0.85, True,
                              "Heel cushioning for severe high arch")
            add_recommendation("Metatarsal Pad", "intrinsic", 0.80, False,
                              "Forefoot cushioning for severe high arch")
        if arch_degree == 4:
            flags["severe_pes_cavus"] = True

    # Alignment-based wedges and posting
    # Forefoot alignment
    if alignment.get("forefoot") == "valgus":
        confidence_val = 0.75 + (0.05 * arch_degree)  # Higher confidence with higher arch degree
        add_recommendation("Anterior Medial Wedge", "extrinsic", confidence_val, True,
                         "Forefoot valgus correction")
        if arch_degree >= 3:
            add_recommendation("SAW (Supinator Anterior Wedge)", "extrinsic", 0.85, arch_degree >= 3,
                             "Advanced forefoot valgus correction for severe arch issues")
    
    elif alignment.get("forefoot") == "varus":
        confidence_val = 0.75 + (0.05 * arch_degree)
        add_recommendation("Anterior Lateral Wedge", "extrinsic", confidence_val, True,
                         "Forefoot varus correction")
        if arch_degree >= 3:
            add_recommendation("PAW (Pronator Anterior Wedge)", "extrinsic", 0.85, arch_degree >= 3,
                             "Advanced forefoot varus correction for severe arch issues")
    
    # Midfoot alignment
    if alignment.get("midfoot") == "valgus":
        confidence_val = 0.75 + (0.05 * arch_degree)
        add_recommendation("MAS (Medial Arch Support)", "intrinsic", confidence_val, True,
                         "Midfoot valgus support")
        if arch_degree >= 2:
            add_recommendation("NAS (Navicular Arch Support)", "intrinsic", 0.85, True,
                             "Navicular support for midfoot valgus")
    
    elif alignment.get("midfoot") == "varus":
        if "High Arch" in arch_type:
            add_recommendation("AS (Arch Support)", "intrinsic", 0.75, True,
                             "Midfoot varus support for high arch")
    
    # Hindfoot alignment
    if alignment.get("hindfoot") == "valgus":
        confidence_val = 0.75 + (0.05 * arch_degree)
        add_recommendation("Posterior Medial Wedge", "extrinsic", confidence_val, True,
                         "Hindfoot valgus correction")
        if arch_degree >= 3:
            add_recommendation("SPW (Supinator Posterior Wedge)", "extrinsic", 0.85, True,
                             "Advanced hindfoot valgus correction")
    
    elif alignment.get("hindfoot") == "varus":
        confidence_val = 0.75 + (0.05 * arch_degree)
        add_recommendation("Posterior Lateral Wedge", "extrinsic", confidence_val, True,
                         "Hindfoot varus correction")
        if arch_degree >= 3:
            add_recommendation("PPW (Pronator Posterior Wedge)", "extrinsic", 0.85, True,
                             "Advanced hindfoot varus correction")

    # Comprehensive pathology-specific recommendations
    pathology_map = {
        # Toe Area Pathologies
        "Claw Toe": [
            {"name": "Toe Crest", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Cushioning", "category": "intrinsic", "confidence": 0.80, "primary": False}
        ],
        "Hammer Toe": [
            {"name": "Toe Crest", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Toe Loop", "category": "extrinsic", "confidence": 0.75, "primary": False}
        ],
        "Mallet Toe": [
            {"name": "Toe Crest", "category": "intrinsic", "confidence": 0.80, "primary": True}
        ],
        "Tennis Toe": [
            {"name": "Toe part Cushioning", "category": "intrinsic", "confidence": 0.75, "primary": True}
        ],
        "Skiers Toe": [
            {"name": "Toe part Cushioning", "category": "intrinsic", "confidence": 0.75, "primary": True}
        ],
        "Turf Toe": [
            {"name": "MP", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "MPL", "category": "intrinsic", "confidence": 0.80, "primary": False},
            {"name": "Morton's Extension", "category": "extrinsic", "confidence": 0.90, "primary": True}
        ],
        
        # Forefoot Area Pathologies
        "Hallux Valgus": [
            {"name": "AS", "category": "intrinsic", "confidence": 0.70, "primary": False},
            {"name": "Anterior Medial Wedge", "category": "extrinsic", "confidence": 0.85, "primary": True},
            {"name": "Hallux Separator", "category": "intrinsic", "confidence": 0.80, "primary": True}
        ],
        "Hallux Rigidus": [
            {"name": "Morton's to toe Extension (Stiff plate)", "category": "extrinsic", "confidence": 0.95, "primary": True},
            {"name": "Kinetic Wedge", "category": "extrinsic", "confidence": 0.85, "primary": True}
        ],
        "Hallux Limitus": [
            {"name": "Morton's Extension", "category": "extrinsic", "confidence": 0.90, "primary": True},
            {"name": "Rocker Sole", "category": "extrinsic", "confidence": 0.85, "primary": False}
        ],
        "Metatarsalgia": [
            {"name": "MP", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "MPL", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Metatarsal Bar", "category": "extrinsic", "confidence": 0.80, "primary": False}
        ],
        "Bunion Pain": [
            {"name": "AS", "category": "intrinsic", "confidence": 0.70, "primary": False},
            {"name": "Anterior Medial Wedge", "category": "extrinsic", "confidence": 0.85, "primary": True},
            {"name": "Bunion Shield", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Bunionette": [
            {"name": "5th Met Head Relief", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Lateral Forefoot Spacer", "category": "intrinsic", "confidence": 0.85, "primary": False}
        ],
        "Morton Neuroma": [
            {"name": "MP", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "MPL", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Metatarsal Bar", "category": "extrinsic", "confidence": 0.80, "primary": False},
            {"name": "Neuroma Pad", "category": "intrinsic", "confidence": 0.95, "primary": True}
        ],
        "Sesamoiditis": [
            {"name": "Sesamoid Relief Pad", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "1st Met Head Off-loading", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        
        # Midfoot Area Pathologies
        "Midfoot Arthritis": [
            {"name": "AS", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Fascia Groove", "category": "intrinsic", "confidence": 0.80, "primary": False},
            {"name": "Carbon Plate", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Arch Pain": [
            {"name": "AS", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Arch Cushioning", "category": "intrinsic", "confidence": 0.85, "primary": False}
        ],
        "Kohler's disease": [
            {"name": "NAS", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Navicular Off-loading", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Peroneal Tendon Enteropathy": [
            {"name": "Posterior Lateral Wedge", "category": "extrinsic", "confidence": 0.85, "primary": True},
            {"name": "Lateral Border Support", "category": "intrinsic", "confidence": 0.80, "primary": False}
        ],
        "Cuboid Syndrome": [
            {"name": "Valgus cuboid pad", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Cuboid Off-Load", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Lateral Midfoot Support", "category": "intrinsic", "confidence": 0.80, "primary": False}
        ],
        "Accessory Navicular": [
            {"name": "NAS", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Posterior Medial Wedge", "category": "extrinsic", "confidence": 0.85, "primary": True},
            {"name": "Navicular Relief Cut-out", "category": "intrinsic", "confidence": 0.95, "primary": True}
        ],
        "Navicular Pain": [
            {"name": "NAS", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Posterior Medial Wedge", "category": "extrinsic", "confidence": 0.80, "primary": False},
            {"name": "Navicular Off-loading", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Lisfranc Injury": [
            {"name": "Carbon Plate", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "AS", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Rigid Midfoot Support", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        
        # Hindfoot Area Pathologies
        "Plantar Fasciitis": [
            {"name": "Heel Cushion Pad", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Fascia Groove", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Calcaneal Spur Accommodation", "category": "intrinsic", "confidence": 0.80, "primary": False}
        ],
        "Heel Spur": [
            {"name": "Heel Spur Pad", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Calcaneal Spur Accommodation", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Posterior Tibialis Tendinitis": [
            {"name": "AS", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "MAS", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Medial Heel Wedge", "category": "extrinsic", "confidence": 0.85, "primary": True}
        ],
        "Tarsal Tunnel Syndrome": [
            {"name": "AS", "category": "intrinsic", "confidence": 0.80, "primary": False},
            {"name": "Heel Lift Pad", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Medial Arch Relief", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Calcaneus Fx": [
            {"name": "Heel Lift Pad", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Total Contact Orthotic", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Heel Fat Pad Atrophy": [
            {"name": "Heel Cushion Pad", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Shock Absorbing Heel", "category": "extrinsic", "confidence": 0.90, "primary": True}
        ],
        "Achilles Tendinitis": [
            {"name": "Heel Cushion Pad", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Heel Lift Pad", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Achilles Notch", "category": "extrinsic", "confidence": 0.80, "primary": False}
        ],
        "Haglund's Deformity": [
            {"name": "Heel Lift Pad", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Achilles Notch", "category": "extrinsic", "confidence": 0.95, "primary": True},
            {"name": "Heel Cup", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Sever's Disease": [
            {"name": "Heel Lift Pad", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Heel Cushion Pad", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Achilles Notch", "category": "extrinsic", "confidence": 0.85, "primary": False}
        ]
    }

    # Add recommendations for each detected pathology
    for condition in detected_pathologies:
        condition_recs = pathology_map.get(condition, [])
        for rec in condition_recs:
            add_recommendation(
                rec["name"], 
                rec["category"], 
                rec["confidence"], 
                rec["primary"],
                f"Recommendation for {condition}"
            )

    # Other foot conditions with enhanced detection
    other_conditions_map = {
        "Abnormal peak pressure": [
            {"name": "Soft Cushioning", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Pressure Relief Pad", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Callus and Pain Point": [
            {"name": "Soft Cushioning", "category": "intrinsic", "confidence": 0.85, "primary": True},
            {"name": "Off-Loading", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Pressure Relief Pad", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Ulcer": [
            {"name": "Off-Loading", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Total Contact Orthotic", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Ulcer Relief Aperture", "category": "intrinsic", "confidence": 0.95, "primary": True}
        ],
        "Toe/Foot Part Amputation": [
            {"name": "Toe filler", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Amputation Accommodation", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Rocker Sole", "category": "extrinsic", "confidence": 0.90, "primary": True}
        ],
        "Leg Length Discrepancy": [
            {"name": "Heel Height Pad", "category": "extrinsic", "confidence": 0.95, "primary": True},
            {"name": "Full Length Lift", "category": "extrinsic", "confidence": 0.90, "primary": False}
        ],
        "Charcot Foot": [
            {"name": "Total Contact Orthotic", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Rocker Sole", "category": "extrinsic", "confidence": 0.90, "primary": True},
            {"name": "Pressure Distribution Insole", "category": "intrinsic", "confidence": 0.90, "primary": True}
        ],
        "Diabetes with Neuropathy": [
            {"name": "Total Contact Orthotic", "category": "intrinsic", "confidence": 0.95, "primary": True},
            {"name": "Soft Cushioning", "category": "intrinsic", "confidence": 0.90, "primary": True},
            {"name": "Pressure Redistribution", "category": "intrinsic", "confidence": 0.95, "primary": True}
        ]
    }

    # Process other conditions with enhanced detection logic
    other_conditions = {
        "Abnormal peak pressure": False,
        "Callus and Pain Point": False,
        "Ulcer": False,
        "Toe/Foot Part Amputation": False,
        "Leg Length Discrepancy": False,
        "Charcot Foot": False,
        "Diabetes with Neuropathy": False
    }
    
    # Enhanced detection logic
    # Use detected pathologies to infer some other conditions
    if "Metatarsalgia" in detected_pathologies:
        other_conditions["Abnormal peak pressure"] = True
    if "Plantar Fasciitis" in detected_pathologies and arch_degree >= 3:
        other_conditions["Callus and Pain Point"] = True
    
    # Use patient context for additional inferences if available
    if patient_context:
        if "diabetes" in [x.lower() for x in patient_context.get("medical_history", [])]:
            if "neuropathy" in [x.lower() for x in patient_context.get("medical_history", [])]:
                other_conditions["Diabetes with Neuropathy"] = True
                flags["high_risk_foot"] = True
        
        if "amputation" in [x.lower() for x in patient_context.get("medical_history", [])]:
            other_conditions["Toe/Foot Part Amputation"] = True
        
        if "charcot" in [x.lower() for x in patient_context.get("medical_history", [])]:
            other_conditions["Charcot Foot"] = True
            flags["high_risk_foot"] = True
        
        if patient_context.get("leg_length_discrepancy", False):
            other_conditions["Leg Length Discrepancy"] = True
            
        if patient_context.get("ulcer_history", False) or "ulcer" in [x.lower() for x in patient_context.get("medical_history", [])]:
            other_conditions["Ulcer"] = True
            flags["high_risk_foot"] = True
    
    # Process enhanced other conditions
    for condition, condition_present in other_conditions.items():
        if condition_present:
            condition_recs = other_conditions_map.get(condition, [])
            for rec in condition_recs:
                add_recommendation(
                    rec["name"], 
                    rec["category"], 
                    rec["confidence"], 
                    rec["primary"],
                    f"Recommendation for {condition}"
                )
    
    # Add flags to the recommendations
    recommendations["flags"] = flags
    
    # Return the enhanced recommendations structure
    return recommendations


def map_abbreviations(recommendations_data: Union[List[str], Dict[str, Any]]) -> Dict[str, str]:
    """
    Maps abbreviations to their full names for clarity in reports.
    
    Args:
        recommendations_data: Either a list of recommendation strings or the full recommendations dictionary
        
    Returns:
        Dictionary mapping abbreviations to their full names
    """
    abbreviation_map = {
        "MP": "Metatarsal Pad",
        "MPL": "Metatarsal Platform",
        "MT Bar": "Metatarsal Bar",
        "AS": "Arch Support",
        "MAS": "Medial Arch Support",
        "NAS": "Navicular Arch Support",
        "SAW": "Supinator Anterior Wedge",
        "PAW": "Pronator Anterior Wedge",
        "SPW": "Supinator Posterior Wedge",
        "PPW": "Pronator Posterior Wedge",
        "LLD": "Leg Length Discrepancy",
        "1MT": "First Metatarsal",
        "5MT": "Fifth Metatarsal"
    }
    
    result = {}
    
    # Handle both list input (backward compatibility) and dictionary input
    if isinstance(recommendations_data, list):
        recommendations_list = recommendations_data
    elif isinstance(recommendations_data, dict):
        # If given the full recommendations dictionary, extract all recommendations
        recommendations_list = []
        if "intrinsic" in recommendations_data:
            recommendations_list.extend(recommendations_data["intrinsic"])
        if "extrinsic" in recommendations_data:
            recommendations_list.extend(recommendations_data["extrinsic"])
        if "combined_list" in recommendations_data:
            recommendations_list = recommendations_data["combined_list"]
    else:
        return {}
    
    for rec in recommendations_list:
        # Extract abbreviation from the recommendation (before any parentheses)
        abbr = rec.split('(')[0].strip()
        if abbr in abbreviation_map:
            result[abbr] = abbreviation_map[abbr]
    
    return result