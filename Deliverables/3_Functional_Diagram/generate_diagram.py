from diagrams import Diagram, Cluster, Edge
from diagrams.gcp.storage import Storage
from diagrams.gcp.compute import Functions
from diagrams.firebase.base import Firebase
from diagrams.firebase.develop import Authentication, Firestore
from diagrams.onprem.client import Client, User
from diagrams.programming.framework import React
from diagrams.generic.device import Mobile
from diagrams.generic.os import Android
from diagrams.gcp.ml import TPU
from diagrams.custom import Custom

with Diagram("Highly Detailed System Architecture", show=False, filename="System_Architecture_Detailed", direction="LR"):
    operator = User("Warehouse Operator")

    with Cluster("AGV Fleet Environment"):
        agv = Mobile("AGV Camera")
        sensors = Android("Proximity Sensors")
        mic = Android("Audio Stream")
        
    with Cluster("Dashboard Frontend (React)"):
        ui = React("React App")
        evidence_upload = Client("Upload Media")
        telemetry_form = Client("Telemetry Form")
        action_board = Client("Action Center")
        
        ui - evidence_upload
        ui - telemetry_form
        ui - action_board

    with Cluster("Firebase Cloud Backend"):
        auth = Authentication("Google Auth")
        db = Firestore("Incident Firestore")
        
        with Cluster("Node.js Logic"):
            pipeline = Functions("Prompt Pipeline")
            history = Functions("History Retrieval")

    with Cluster("Google Cloud AI"):
        gemini = TPU("Gemini 3 Flash VLA\n(temperature=0.0)")

    agv >> Edge(label="Visual Frames") >> evidence_upload
    sensors >> Edge(label="Velocity/Distance") >> telemetry_form
    mic >> Edge(label="Ambient WAV") >> evidence_upload

    operator >> auth >> ui

    evidence_upload >> auth
    telemetry_form >> pipeline
    action_board >> Edge(label="Final Action") >> db

    pipeline << Edge(label="Top-K Summary") << history
    history << db

    pipeline >> Edge(label="Multimodal Prompt") >> gemini
    gemini >> Edge(label="Schema JSON") >> pipeline
    
    pipeline >> Edge(label="Render Warning/Action") >> action_board
    pipeline >> Edge(label="Log Inference") >> db

