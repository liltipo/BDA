from neo4j import GraphDatabase

class PonyDatabase:
    def __init__(self, uri, user, password, database_name):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.database_name = database_name

    def close(self):
        self.driver.close()

    def run_query(self, query, parameters=None):
        with self.driver.session(database=self.database_name) as session:
            result = session.run(query, parameters)
            return [dict(i) for i in result]


def add_pony():
    name = input("Ingresa el nombre del pony: ")
    color = input("Ingresa el color del pony: ")
    tipo = input("Ingresa el tipo del pony: ")
    habilidad = input("Ingresa la habilidad del pony: ")
    cutiemark = input("Ingresa la cutiemark del pony: ")
    gusto = input("Ingresa el gusto del pony: ")
    bebida = input("Ingresa la bebida favorita del pony: ")

    query = """
    MATCH (vinyl:Pony {nombre: 'Vinyl Scratch'})
    CREATE (pony:Pony {
        nombre: $name, color: $color, tipo: $tipo,
        habilidad: $habilidad, cutiemark: $cutiemark,
        gusto: $gusto, bebida: $bebida}),
    (pony)<-[:AMIGOS]-(vinyl), 
    (pony)-[:AMIGOS]->(vinyl)
    """
    params = {
        "name": name,
        "color": color,
        "tipo": tipo,
        "habilidad": habilidad,
        "cutiemark": cutiemark,
        "gusto": gusto,
        "bebida": bebida
    }
    db.run_query(query, params)


def count_ponies_city():
    ciudad = input("Ingresa el nombre de la ciudad: ")
    query = """
    MATCH (ciudad:Ciudad {nombre: $ciudad})<-[r:VIVE_EN]-(p:Pony)
    WHERE p.tipo IN ["Pony terrestre", "Pegaso", "Unicornio"]
    RETURN count(*) AS total
    """
    params = {"ciudad": ciudad}
    result = db.run_query(query, params)
    print(result[0]["total"])


def anexo_ponies():
    query = """
    MATCH (p:Pony)-[r:AMIGOS]->(a:Pony)
    WITH count(r) AS num_amigos, p
    SET p.anexo = CASE 
        WHEN p.tipo = "Unicornio" AND num_amigos >= 3 THEN "Sociable"
        WHEN p.tipo = "Alicornio" THEN "Realeza"
        WHEN p.tipo = "Unicornio" AND num_amigos = 2 THEN "Reservado"
        WHEN p.tipo = "Unicornio" AND num_amigos = 1 THEN "Solitario"
        WHEN p.tipo = "Pony terrestre" AND num_amigos >= 4 THEN "Hipersociable"
        WHEN p.tipo = "Pony terrestre" AND num_amigos <= 2 THEN "Reservado"
        ELSE "Por completar"
    END
    """
    db.run_query(query)


def shortest_path_ponies():
    name1 = input("Ingresa el nombre del primer pony: ")
    name2 = input("Ingresa el nombre del segundo pony: ")
    query = """
    MATCH p = shortestPath((a:Pony {nombre: $name1})-[:AMIGOS*0..]->(b:Pony {nombre: $name2}))
    RETURN p
    """
    result = db.run_query(query, {"name1": name1, "name2": name2})
    out = ""
    if result:
        path = result[0]['p']
        for node in path.nodes:
            out += node['nombre']
            if node['nombre'] != name2:
                out += " -> "
    else:
        out = "No existe relación"
    print(out)


def friends_of_friends():
    name = input("Ingresa el nombre del pony: ")
    query = """
    MATCH (p:Pony {nombre: $name}) -[r:AMIGOS*2]->(a:Pony)
    WHERE NOT (p)-[:AMIGOS]->(a) AND p <> a
    RETURN DISTINCT a.nombre
    """
    result = db.run_query(query, {"name": name})
    out = "\n".join([r['a.nombre'] for r in result])
    print(out)


def magic_ponies():
    query = """
    MATCH (p:Pony)
    WHERE toLower(p.habilidad) =~ ".*magia.*"
    RETURN p.nombre
    """
    result = db.run_query(query)
    out = "\n".join([r['p.nombre'] for r in result])
    print(out)


def unidirectional_friends():
    query = """
        MATCH (a:Pony)-[c:AMIGOS]->(b:Pony)
        WHERE NOT (b)-[:AMIGOS]->(a)
        RETURN a.nombre,b.nombre
        """
    result = db.run_query(query)
    out = ""
    for r in result:
        out += f"{r['a.nombre']} -> {r['b.nombre']}\n"
    print(out)


def drink_count():
    tipo = input("Ingresa el tipo de pony: ")
    query = """
    MATCH (p:Pony {tipo: $tipo})
    WITH 
        SUM(CASE WHEN p.bebida = "Coca Cola" THEN 1 ELSE 0 END) AS cocacola,
        SUM(CASE WHEN p.bebida = "Sprite" THEN 1 ELSE 0 END) AS sprite
    RETURN cocacola, sprite
    """
    result = db.run_query(query, {"tipo": tipo})
    print(f"Coca Cola: {result[0]['cocacola']}, Sprite: {result[0]['sprite']}")


def enemies_gt_colab():
    query = """
    MATCH (b:Pony)<-[e:ENEMIGOS]-(p:Pony)
    WITH p, COUNT(e) AS enemigos
    OPTIONAL MATCH (p)-[c:COLABORACION]->(a:Pony)
    WITH p, enemigos, SUM(
        CASE 
            WHEN c IS NULL THEN 0
            ELSE 1
        END) AS colaboraciones
    WHERE enemigos > colaboraciones
    RETURN p.nombre
    """
    result = db.run_query(query)
    out = "\n".join([r['p.nombre'] for r in result])
    print(out)


def cocacola_sprite_friends():
    query = """
    MATCH (p:Pony {bebida: "Coca Cola"}) -[r:AMIGOS]->(a:Pony {tipo:"Pony terrestre", bebida: "Sprite"})
    RETURN DISTINCT p.nombre
    """
    result = db.run_query(query)
    out = "\n".join([r['p.nombre'] for r in result])
    print(out)


def menu():
    fcontinue = True

    while fcontinue:
        print("""\
    0.  Salir del programa
    1.  Agregar pony
    2.  Contar pegasos, ponis terrestres y unicornios en ciudad
    3.  Agregar anexo a ponies
    4.  Camino más corto entre 2 ponies
    5.  Encontrar amigos de amigos de un pony
    6.  Ponies con magia
    7.  Ponies con amigos unidireccionales
    8.  Contar bebidas por tipo de pony
    9.  Ponies con enemigos > colaboraciones
    10. Ponies que toman Coca Cola con amigos que toman Sprite
    """)
        option = input("Ingresa una opción: ")
        match option:
            case "0":
                fcontinue = False
            case "1":
                add_pony()
            case "2":
                count_ponies_city()
            case "3":
                anexo_ponies()
            case "4":
                shortest_path_ponies()
            case "5":
                friends_of_friends()
            case "6":
                magic_ponies()
            case "7":
                unidirectional_friends()
            case "8":
                drink_count()
            case "9":
                enemies_gt_colab()
            case "10":
                cocacola_sprite_friends()
            case _:
                print("Invalid option")

#Cuando no especifica que tipo de relacion de amistad es, se asume que unidireccional desde el pony a sus amigos (->)

if __name__ == "__main__":
    db = PonyDatabase("bolt://localhost:7687", "neo4j", "pony1234", "ponydb")
    menu()

    db.close()

