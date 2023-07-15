import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db("ChattyPete")

    try {
        const result = await db.collection("chats").deleteMany();
        res.status(200).json({
            message: "Deleted"
        })
        
    } catch (e) {
        res.status(500).json({
            message: "Error clearing database"
        })
    }
}