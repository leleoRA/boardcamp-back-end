import connection from "../database.js";

export async function getRentals(req, res) {
    try {
        const { customerId, gameId } = req.query;

        let queryCustomerId = '';
        let queryGameId = '';

        if (customerId && gameId) {
            queryCustomerId = `WHERE "customerId"=${customerId} AND "gameId"=${gameId}`;
        } else if (customerId) {
            queryCustomerId = `WHERE "customerId"=${customerId}`;
        } else if (gameId) {
            queryGameId = `WHERE "gameId"=${gameId}`;
        }

        const rentals = await connection.query({
            text: `
                SELECT 
                    rentals.*, 
                    customers.id,
                    customers.name,
                    games.id,
                    games.name,
                    games."categoryId",
                    categories.name
                FROM rentals
                    JOIN customers ON rentals."customerId"=customers.id
                    JOIN games ON rentals."gameId"=games.id
                    JOIN categories ON games."categoryId"=categories.id
                ${queryCustomerId}
                ${queryGameId}
                `,
            rowMode: 'array'
        })

        res.status(200).send(rentals.rows.map(row => {
            const [
                id,
                customerId,
                gameId,
                rentDate,
                daysRented,
                returnDate,
                originalPrice,
                delayFee,
                idCustomer,
                nameCustomer,
                idGame,
                nameGame,
                categoryId,
                categoryName
            ] = row;

            return {
                id,
                customerId,
                gameId,
                rentDate,
                daysRented,
                returnDate,
                originalPrice,
                delayFee,
                customer: { id: idCustomer, name: nameCustomer },
                game: { id: idGame, name: nameGame, categoryId, categoryName }
            }
        }));
    } catch (error) {
        res.status(500).send(error);
    }
}

export async function postRentals(req, res) {
    try {
        const { customerId, gameId, daysRented } = req.body;
        // const rentDate = new Date(Date.now()).toISOString();
        const rentDate = new Date(2022, 2, 2).toISOString();

        const customerExists = await connection.query(`
            SELECT * 
            FROM customers
            WHERE id=$1`
            , [customerId]);

        if (customerExists.rowCount === 0) {
            return res.sendStatus(400);
        }

        const game = await connection.query(`
            SELECT *
            FROM games
            WHERE id=$1`
            , [gameId]);

        if (game.rowCount === 0) {
            return res.sendStatus(400);
        }

        const stockTotal = game.rows[0].stockTotal;

        const gamesRentedQuantity = await connection.query(`
            SELECT * 
            FROM rentals
            WHERE "gameId"=$1`
            , [gameId]);

        if (gamesRentedQuantity.rowCount >= stockTotal) {
            return res.sendStatus(400);
        }

        const pricePerDay = game.rows[0].pricePerDay;
        const originalPrice = pricePerDay * daysRented;

        await connection.query(`
            INSERT INTO 
                rentals("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
            VALUES($1,$2,$3,$4,null,$5,null)`
            , [customerId, gameId, rentDate, daysRented, originalPrice]);

        res.sendStatus(201);
    } catch (error) {
        res.status(500).send(error);
    }
}

export async function endRental(req, res) {
    try {
        const { id } = req.params;
        const returnDate = new Date(Date.now()).toISOString();

        const rental = await connection.query(`
            SELECT * 
            FROM rentals
            WHERE id=$1`
            , [id]);

        if (rental.rowCount === 0) {
            return res.sendStatus(404);
        }

        if (rental.rows[0].returnDate !== null) {
            return res.sendStatus(400);
        }

        const convertMillisecondsToDays = (1000 * 3600 * 24);
        const millisecondsDate = new Date(Date.now()).setHours(0, 0, 0, 0);
        const difference = millisecondsDate - rental.rows[0].rentDate.getTime();
        const daysPassed = Math.ceil(difference / convertMillisecondsToDays);

        const pricePerDay = rental.rows[0].originalPrice / rental.rows[0].daysRented;
        let delayFee = 0;
        if (daysPassed > rental.rows[0].daysRented) {
            const delay = daysPassed - rental.rows[0].daysRented;
            delayFee = pricePerDay * delay;
        }

        await connection.query(`
            UPDATE rentals
            SET "returnDate"=$1,
                "delayFee"=$2
            WHERE id=$3`
            , [returnDate, delayFee, id]);

        res.sendStatus(200);
    } catch (error) {
        res.status(500).send(error);
    }
}

export async function deleteRental(req, res) {
    try {



        res.sendStatus(200);
    } catch (error) {
        res.status(500).send(error);
    }
}