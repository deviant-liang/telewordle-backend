// 更新用戶資料
async function findAndUpdateUser(collection, userId, newWord) {
    const user = await collection.findOne({ TelegramID: userId }, { projection: { CurrentWord: 0 } });

    if (user) {
        await collection.updateOne(
            { TelegramID: userId },
            { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
        );
    }

    return user;
}

// 取得用戶資料
async function handleExistingUser(collection, user) {
    let referralsData = [];

    if (user.Referrals && user.Referrals.length > 0) {
        referralsData = await collection.find(
            { TelegramID: { $in: user.Referrals } },
            { projection: { Name: 1, Points: 1 } }
        ).toArray();
    }

    return { ...user, referralsData };
}

// 建立新用戶
async function createNewUser(collection, userId, name, referrerId) {
    let validReferrer = null;

    if (referrerId) {
        validReferrer = await collection.findOne({ TelegramID: referrerId });
    }

    const newUser = {
        TelegramID: userId,
        Name: name,
        Rank: 0,
        PlayCount: 0,
        Points: 0,
        Referrer: validReferrer ? referrerId : null,
        ReferralCount: 0,
        Referrals: [],
        CurrentWord: '',
        CurrentGuesses: []
    };

    await collection.insertOne(newUser);

    if (validReferrer) {
        await collection.updateOne(
            { TelegramID: referrerId },
            { $inc: { ReferralCount: 1 }, $push: { Referrals: userId } }
        );
    }

    const { CurrentWord, ...returnUser } = newUser;
    return returnUser;
}

// 取得排行榜
async function getLeaderboard(collection, userId) {
    const topUsers = await collection.find({})
        .sort({ Points: -1 })
        .limit(10)
        .toArray();

    let userRank = null;
    if (userId) {
        const userPoints = await collection.findOne({ TelegramID: userId }, { projection: { Points: 1 } });
        if (userPoints) {
            userRank = await collection.countDocuments({ Points: { $gt: userPoints.Points } }) + 1;
        }
    }

    return { topUsers, userRank };
}


module.exports = { findAndUpdateUser, handleExistingUser, createNewUser, getLeaderboard };