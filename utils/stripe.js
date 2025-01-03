/*
بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ  ﷺ  
Insha Allah,  By his marcy I will Gain Success 
*/

import { stringify } from 'qs';
import { T_STRIPE_KEY } from '../env.js';
import Stripe from 'stripe';
const str=new Stripe(T_STRIPE_KEY);

export default  class StripePay {
    constructor(options={success_url:"", cancel_url:"" }) {
        this.success_url=options.success_url;
        this.cancel_url=options.cancel_url;
    }
    async checkOut({line_items, shipping_amount,line_items}){
        const session=await str.checkout.sessions.create({
            payment_method_types :['card'],
            mode: 'payment',
            success_url:this.success_url ,
            cancel_url:this.cancel_url,
            shipping_address_collection:{},
            shipping_options: [
                {
                    shipping_rate_data: {
                        display_name: 'Standard Shipping',
                        type: 'fixed_amount',
                        fixed_amount: {
                            amount: shipping_amount ,
                            currency: 'usd',
                        },
                    },
                },
            ],
            line_items :line_items
        })

        if (session.url)  {
            return ({
                url :session.url,
                id :session.id
            })
        }
    }
}
