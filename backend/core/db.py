from pymongo import MongoClient
import uuid
import hashlib

class Database:
    def __init__(self):
        try:
            self.client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
            self.db = self.client["smart_doc_verifier"]
            # Collections
            self.doc_types    = self.db.document_types
            self.services     = self.db.services
            self.master_docs  = self.db.master_documents
            self.user_links   = self.db.user_links
            self.activity_logs = self.db.activity_logs
            # Index for fast hash lookup
            self.master_docs.create_index("file_hash", sparse=True)
            print("Connected to MongoDB successfully")
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")

    # ── Document Types ────────────────────────────────────────────────
    def get_all_doc_types(self):
        return list(self.doc_types.find({}, {'_id': 0}))

    def add_doc_type(self, name, description=""):
        doc_type = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "description": description
        }
        self.doc_types.insert_one(doc_type)
        doc_type.pop('_id', None)
        return doc_type

    # ── Services ──────────────────────────────────────────────────────
    def get_all_services(self):
        return list(self.services.find({}, {'_id': 0}))

    def add_service(self, name):
        service = {
            "id": str(uuid.uuid4())[:8],
            "name": name
        }
        self.services.insert_one(service)
        service.pop('_id', None)
        return service

    # ── Master Documents ──────────────────────────────────────────────
    def add_master_doc(self, doc_type_id, file_path, linked_service_ids, file_hash=None):
        master_doc = {
            "id":                  str(uuid.uuid4())[:8],
            "doc_type_id":         doc_type_id,
            "file_path":           file_path,
            "linked_service_ids":  linked_service_ids,
            "file_hash":           file_hash,          # SHA-256 of the raw file bytes
        }
        self.master_docs.insert_one(master_doc)
        master_doc.pop('_id', None)
        return master_doc

    def get_master_docs(self):
        return list(self.master_docs.find({}, {'_id': 0}))

    def find_master_by_hash(self, file_hash: str):
        """Exact SHA-256 hash lookup — O(1) with the index."""
        return self.master_docs.find_one({"file_hash": file_hash}, {'_id': 0})

    def update_master_features(self, master_id, ipfs_hash, sift_kp, image_hash, spatial_hashes):
        self.master_docs.update_one(
            {"id": master_id},
            {"$set": {
                "ipfs_hash":      ipfs_hash,
                "sift_keypoints": sift_kp,
                "image_hash":     image_hash,
                "spatial_hashes": spatial_hashes
            }}
        )

    # ── User Links ────────────────────────────────────────────────────
    def get_user_links(self, user_id, doc_type_id):
        return self.user_links.find_one(
            {"user_id": user_id, "doc_type_id": doc_type_id}, {'_id': 0}
        )

    def update_user_link(self, user_id, doc_type_id, service_id, action):
        query = {"user_id": user_id, "doc_type_id": doc_type_id}
        link  = self.user_links.find_one(query)

        if not link:
            if action == 'unlink':
                return None
            link = {
                "user_id":             user_id,
                "doc_type_id":         doc_type_id,
                "unlinked_service_ids": [],
                "history":             []
            }
            self.user_links.insert_one(link)
            link = self.user_links.find_one(query)

        if action == 'unlink':
            if service_id not in link['unlinked_service_ids']:
                self.user_links.update_one(query, {"$push": {
                    "unlinked_service_ids": service_id,
                    "history": {"action": "unlink", "service_id": service_id,
                                "timestamp": str(uuid.uuid1())}
                }})
        elif action == 'link':
            if service_id in link['unlinked_service_ids']:
                self.user_links.update_one(query, {
                    "$pull": {"unlinked_service_ids": service_id},
                    "$push": {"history": {"action": "link", "service_id": service_id,
                                          "timestamp": str(uuid.uuid1())}}
                })

        return self.user_links.find_one(query, {'_id': 0})

    # ── Activity Logs ─────────────────────────────────────────────────
    def log_activity(self, user_id, action, details):
        self.activity_logs.insert_one({
            "user_id":   user_id,
            "action":    action,
            "details":   details,
            "timestamp": str(uuid.uuid1())
        })

    # ── Utility ───────────────────────────────────────────────────────
    @staticmethod
    def compute_file_hash(file_bytes: bytes) -> str:
        """SHA-256 hash of raw file bytes."""
        return hashlib.sha256(file_bytes).hexdigest()


db_manager = Database()
