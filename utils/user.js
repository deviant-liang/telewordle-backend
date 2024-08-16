// 建立新用戶
async function createNewUser(collection, userId, name, referrerId) {
    let validReferrer = null;

    if (referrerId) {
        validReferrer = await collection.findOne({ TelegramID: referrerId });
    }

    const newUser = {
        TelegramID: userId,
        Name: name,
        Points: 0,
        Referrer: validReferrer ? referrerId : null,
        Referrals: [],
        CurrentWord: '',
        CurrentGuesses: [],
        LastGuessTime: new Date(),
    };

    await collection.insertOne(newUser);

    if (validReferrer) {
        await collection.updateOne(
            { TelegramID: referrerId },
            { $push: { Referrals: userId } }
        );
    }

    const { CurrentWord, _id, ...returnUser } = newUser;
    return returnUser;
}

// 取得用戶資料
async function findUser(collection, userId) {
    const user = await collection.findOne(
        { TelegramID: userId },
        { projection: { CurrentWord: 0, _id: 0 } }
    );
    return user;
}

// 取得排行榜
async function getLeaderboard(collection, userId) {
    // 取得前10
    const topUsers = await collection.find({}, { projection: { Name: 1, Points: 1, _id: 0 } })
        .sort({ Points: -1 })
        .limit(10)
        .toArray();

    // 標示排名
    topUsers.map((user, index) => {
        user.Rank = index === 0 || user.Points !== topUsers[index - 1].Points 
            ? index + 1 
            : topUsers[index - 1].Rank;
        return user;
    });

    // 取得用戶排名
    const userInfo = await collection.findOne({ TelegramID: userId }, { projection: { Name: 1, Points: 1 } });
    const userRank = await collection.countDocuments({ Points: { $gt: userInfo.Points } }) + 1;

    return {
        topUsers,
        userRank
    };
}

module.exports = { findUser, createNewUser, getLeaderboard };