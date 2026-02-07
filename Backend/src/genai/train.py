from personnel.models import Personnel
from conge.models import Conge
from paiement.models import Paiement
from datetime import datetime
from presence.models import Presence
from tache.models import Tache
from personnel.models import Service
from personnel.models import Fonction
from document.models import Document

def train(question):
    personnel = Personnel.objects.all()
    personnel_str = ", ".join([str(p) for p in personnel])

    conge = Conge.objects.all()
    conge_str = ", ".join([str(c) for c in conge])

    paiement = Paiement.objects.all()
    paiement_str = ", ".join([str(p) for p in paiement])

    presence = Presence.objects.all()
    presence_str = ", ".join([str(p) for p in presence])

    tache = Tache.objects.all()
    tache_str = ", ".join([str(t) for t in tache])

    service = Service.objects.all()
    service_str = ", ".join([str(s) for s in service])

    fonction = Fonction.objects.all()
    fonction_str = ", ".join([str(f) for f in fonction])

    documents = Document.objects.all()
    documents_str = ", ".join([str(d) for d in documents])

    training_data = f"""Données RH dans base de données pour que tu puisse repondre aux questions concernant les données RH:
    date et heure actuelle : {datetime.now()}
    - Personnel ou employer : {personnel_str}
    - Congés : {conge_str}
    - Paiements : {paiement_str}
    - Présences : {presence_str}
    - Tâches : {tache_str}
    - Services : {service_str}
    - Fonctions : {fonction_str}
    - Documents : {documents_str}
    
 
        
    quand repond en donnant des données il faut les cites comme suit:
    exemple : 
    * qui sont les personne en conge en ce moment?
     - Diane Keaton, debut : 2022-01-01, fin : 2022-01-10, motif : vacances
    - John Doe, debut : 2022-01-01, fin : 2022-01-10, motif : vacances
    
         Indication de la signification de chaque numéro etats ou status des tache :         
            1 = "A Faire"
            2 = "En Cours"
            3 = "En Revue"
            4 = "Effectuée ou Terminée"
    * liste des taches en cours
     \n - refaire le site web, status : En cours
     \n - faire le rapport, status : En attente

    
    Repond à cette question : {question}
    """
    print(training_data)
    return training_data
