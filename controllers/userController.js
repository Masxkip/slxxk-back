import axios from 'axios';
import User from '../models/user.js';

// ✅ Direct subscription method (optional fallback)
export const subscribeUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.isSubscriber = true;
        await user.save();

        res.json({ message: "Subscription successful", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Subscription failed", error: error.message });
    }
};

// Verified Paystack subscription
export const verifySubscription = async (req, res) => {
    const { reference } = req.body;

    if (!reference) {
        return res.status(400).json({ message: "Missing transaction reference" });
    }

    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            }
        );

        const status = response.data?.data?.status;

        if (status !== "success") {
            return res.status(400).json({ message: "Transaction not successful" });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isSubscriber = true;
        await user.save();

        res.status(200).json({ message: "Subscription verified!", user });
    } catch (error) {
        console.error("Verification error:", error.message);
        res.status(500).json({ message: "Verification failed", error: error.message });
    }
};
