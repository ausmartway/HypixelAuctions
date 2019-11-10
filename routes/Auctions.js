const router = require('express').Router();
const Database = require('../storage/Mongo');
const { auctionList } = require('../handlers/AuctionCache');
const db = new Database();
const io = require('@pm2/io');
const counter = io.counter({ name: "Auctions Route Active Handles" });

router.get('/auctions', async (req, res) => {
    counter.inc();
    req.on('end', () => counter.dec());
    
    const auctions = auctionList;
    const filters = JSON.parse(decodeURI(req.query.filters));
    const itemsPerPage = req.query.items || 10;
    const pageCount = Math.round(auctions.size / itemsPerPage);
    let page = parseInt(req.query.page || 1);

    let data = Array.from(auctions).map(a => ({ ...a[1] }));

    if (filters.name) data = data.filter(i => (i.item_name.toLowerCase()).includes(filters.name.toLowerCase()));
    if (filters.sort) {
        filters.sort.map(f => {
            switch (f) {
                case "ENDING_SOON":
                    data.sort((a, b) => a.end - b.end);
                    break;
                case "PRICE_LOW_HIGH":
                    data.sort((a, b) => (a.highest_bid_amount > 0 ? a.highest_bid_amount : a.starting_bid) - (b.highest_bid_amount > 0 ? b.highest_bid_amount : b.starting_bid));
                    break;
                case "PRICE_HIGH_LOW":
                    data.sort((a, b) => (b.highest_bid_amount > 0 ? b.highest_bid_amount : b.starting_bid) - (a.highest_bid_amount > 0 ? a.highest_bid_amount : a.starting_bid));
                    break;
                case "BIDS_LOW_HIGH":
                    data.sort((a, b) => a.bids.length - b.bids.length);
                    break;
                case "BIDS_HIGH_LOW":
                    data.sort((a, b) => b.bids.length - a.bids.length);
                    break;
            }
        });
    }

    if (page > pageCount) page = 1;

    if (!data) res.json({ success: false });

    res.json({
        success: true,
        page,
        pageCount,
        data: data.slice(page * itemsPerPage - itemsPerPage, page * itemsPerPage)
    });
});

router.get('/auctions/:id', async (req, res) => {
    counter.inc();
    req.on('end', () => counter.dec());

    const auctionId = req.params.id;
    let hypixelAuction;

    hypixelAuction = await db.auction.findById(auctionId);

    if (!hypixelAuction) hypixelAuction = auctionList.get(auctionId);
    if (!hypixelAuction) return res.status(404).json({ success: false, message: "No auction found!" });

    res.json({ success: true, data: hypixelAuction });
});

module.exports = router;