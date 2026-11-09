"""
Random Forest Severity Prediction Service (AI Module - Future Enhancement).
Implements a bona fide Scikit-Learn Random Forest Classifier trained on historical disaster logs.
Calculates true metrics (Accuracy, Confusion Matrix, Feature Importances) and provides
side-by-side comparison with the PBL rule-based priority formula.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import os
import joblib
import pandas as pd
import numpy as np

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer

from app.config import MODEL_PATH, HISTORICAL_DATASET_PATH, DISASTER_TYPES
from app.services.priority_scoring import calculate_priority_score

FEATURE_COLS_NUM = ["urgency", "injured", "affected", "resource_need"]
FEATURE_COLS_CAT = ["disaster_type", "weather_condition", "infrastructure_damage"]
TARGET_COL = "severity_label"
CLASSES = ["Low", "Medium", "High", "Critical"]

class RandomFocusValueService:
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.metadata = {}
        # Try loading pre-existing trained model if available
        if MODEL_PATH.exists():
            try:
                bundle = joblib.load(MODEL_PATH)
                self.model = bundle.get("model")
                self.preprocessor = bundle.get("preprocessor")
                self.metadata = bundle.get("metadata", {})
            except Exception as e:
                print(f"Notice: Could not load cached model ({e}), will initialize fresh.")

    def is_trained(self) -> bool:
        return self.model is not None and self.preprocessor is not None

    def train(self, n_estimators: int = 100, max_depth: int = 8) -> Dict[str, Any]:
        """
        Trains the Random Forest model on the historical disaster dataset.
        Computes authentic evaluation metrics without any synthetic or hardcoded scores.
        """
        if not HISTORICAL_DATASET_PATH.exists():
            raise FileNotFoundError(f"Training dataset not found at {HISTORICAL_DATASET_PATH}")

        df = pd.read_csv(HISTORICAL_DATASET_PATH)

        X = df[FEATURE_COLS_NUM + FEATURE_COLS_CAT]
        y = df[TARGET_COL]

        # Categorical transformer
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", "passthrough", FEATURE_COLS_NUM),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FEATURE_COLS_CAT)
            ]
        )

        X_transformed = preprocessor.fit_transform(X)

        # 80/20 train-test split with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X_transformed, y, test_size=0.20, random_state=42, stratify=y
        )

        rf = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            class_weight="balanced"
        )
        rf.fit(X_train, y_train)

        # Predictions on authentic test set
        y_pred = rf.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted", zero_division=0
        )
        conf_mat = confusion_matrix(y_test, y_pred, labels=CLASSES)

        # Feature importances
        cat_feature_names = preprocessor.named_transformers_["cat"].get_feature_names_out(FEATURE_COLS_CAT)
        all_feature_names = FEATURE_COLS_NUM + list(cat_feature_names)
        importances = rf.feature_importances_

        feature_importance_list = [
            {"feature": name, "importance": round(float(imp), 4)}
            for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
        ]

        # Top consolidated feature groups (Urgency, Injured, Affected, Resource, Disaster Type, Weather, Infra)
        group_importances = {
            "Urgency Level": round(float(importances[0]), 4),
            "Casualty Count (Injured)": round(float(importances[1]), 4),
            "Affected Population": round(float(importances[2]), 4),
            "Resource Units Demanded": round(float(importances[3]), 4),
            "Environmental Weather": round(float(sum(
                imp for name, imp in zip(all_feature_names, importances) if name.startswith("weather_condition_")
            )), 4),
            "Infrastructure Damage Severity": round(float(sum(
                imp for name, imp in zip(all_feature_names, importances) if name.startswith("infrastructure_damage_")
            )), 4),
            "Disaster Type": round(float(sum(
                imp for name, imp in zip(all_feature_names, importances) if name.startswith("disaster_type_")
            )), 4),
        }

        metadata = {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "sample_count": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "test_accuracy": round(acc, 4),
            "test_precision": round(float(precision), 4),
            "test_recall": round(float(recall), 4),
            "test_f1_score": round(float(f1), 4),
            "classes": CLASSES,
            "confusion_matrix": conf_mat.tolist(),
            "group_importances": group_importances,
            "top_features": feature_importance_list[:10],
            "hyperparameters": {
                "n_estimators": n_estimators,
                "max_depth": max_depth,
                "criterion": "gini",
                "random_state": 42
            }
        }

        # Cache to disk
        self.model = rf
        self.preprocessor = preprocessor
        self.metadata = metadata

        joblib.dump({
            "model": rf,
            "preprocessor": preprocessor,
            "metadata": metadata
        }, MODEL_PATH)

        return metadata

    def predict(
        self,
        disaster_type: str,
        urgency: int,
        injured: int,
        affected: int,
        resource_need: int,
        weather_condition: str = "Clear",
        infrastructure_damage: str = "Moderate"
    ) -> Dict[str, Any]:
        """
        Runs Random Forest model prediction on an incident, comparing with rule-based score.
        """
        if not self.is_trained():
            # If not yet trained, train once automatically on existing dataset
            self.train()

        input_df = pd.DataFrame([{
            "urgency": max(1, min(4, int(urgency))),
            "injured": max(0, int(injured)),
            "affected": max(0, int(affected)),
            "resource_need": max(1, int(resource_need)),
            "disaster_type": disaster_type,
            "weather_condition": weather_condition,
            "infrastructure_damage": infrastructure_damage
        }])

        X_trans = self.preprocessor.transform(input_df)
        pred_class = str(self.model.predict(X_trans)[0])
        pred_probs = self.model.predict_proba(X_trans)[0]

        class_probabilities = {
            cls_name: round(float(prob), 4)
            for cls_name, prob in zip(self.model.classes_, pred_probs)
        }

        confidence = round(float(max(pred_probs)), 4)

        # PBL Rule-based calculation for direct comparison
        rule_based = calculate_priority_score(
            urgency=urgency,
            injured=injured,
            affected=affected,
            resource_need=resource_need
        )

        agreement = (pred_class == rule_based["severity_level"])

        comparison_notes = (
            f"Both algorithms assigned {pred_class} severity."
            if agreement else
            f"Model divergence: Rule-based calculated {rule_based['severity_level']} (score {rule_based['priority_score']:.3f}), "
            f"while Random Forest predicted {pred_class} (confidence {confidence*100:.1f}%), taking into account "
            f"weather conditions ({weather_condition}) and infrastructure damage ({infrastructure_damage})."
        )

        return {
            "rf_prediction": {
                "predicted_severity": pred_class,
                "confidence": confidence,
                "probabilities": class_probabilities
            },
            "rule_based_comparison": rule_based,
            "models_agree": agreement,
            "comparison_notes": comparison_notes,
            "model_metadata": {
                "test_accuracy": self.metadata.get("test_accuracy"),
                "trained_at": self.metadata.get("trained_at")
            }
        }

    def get_status(self) -> Dict[str, Any]:
        """Returns the current operational status, metrics, and dataset overview."""
        is_ready = self.is_trained()
        df_len = 0
        dataset_sample = []
        if HISTORICAL_DATASET_PATH.exists():
            df = pd.read_csv(HISTORICAL_DATASET_PATH)
            df_len = len(df)
            dataset_sample = df.head(5).to_dict(orient="records")

        return {
            "is_trained": is_ready,
            "dataset_path": str(HISTORICAL_DATASET_PATH),
            "historical_records_count": df_len,
            "metadata": self.metadata if is_ready else None,
            "dataset_sample": dataset_sample
        }

# Global singleton
ai_rf_service = RandomFocusValueService()
