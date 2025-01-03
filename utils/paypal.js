/*
بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ  ﷺ  
InshaAllah, By his marcy I will Gain Success 
*/



import axios from 'axios'
import { BASE_URL, PAYPAL_LINK, T_PAYPAL_CLIENT_ID, T_PAYPAL_SECRET } from '../env.js';
import fetch from 'node-fetch';
import { log, MakePriceStringSync, validate } from 'string-player';



export default class PaypalPayment {
    constructor(options= {client_id:"", client_secret:"", mode :"" , success_url:"" , cancel_url:"",currency_code:'USD'}) {
        this.client_id=options.client_id;
        this.client_secret=options.client_secret;
        if (!options.mode) options.mode ='sandbox'
        this.api_link= (options.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : "https://api-m.paypal.com");
        if (options.success_url) this.success_url=options.success_url;
        if (options.cancel_url) this.cancel_url =options.cancel_url;
        if (options.currency_code) this.currency_code=options.currency_code;
        if (options.brand_name) this.brand_name=options.brand_name;
    }

    async getAccessToken(){
        let response= await fetch(this.api_link + '/v1/oauth2/token' , {
            headers :{
                "Cache-Control":"no-cache",
                'Authorization' :'Basic '+ Buffer.from(this.client_id +':'+this.client_secret ).toString('base64')
            },
            body :'grant_type=client_credentials',
            method :'POST'
        });
        response= await response.json();
        if (response.access_token) return response.access_token;
        if (response.error) {
            if (response.error_description) {
                throw ({
                    paypalError:{
                        type :response.error,
                        description: 'Client credentials are missing'
                    }
                }) 
            } else {
                throw ({
                    paypalError :{
                        type :response.error,
                        ...response
                    }
                })
            }
        }

    }

    async createPayment(options = { accessToken :"",items: [{ name: 'Sample Item',  unit_amount: { currency_code: 'USD', value: '100.00', }, quantity: '1' }], total: "", productToatal: "", shipping: "", success_url: "", cancel_url: "" ,currency_code :""}) {
        let
            success_url = options.success_url || this.success_url,
            cancel_url = options.cancel_url || this.cancel_url;
        let 
            items = options.items,
            currency_code = options.currency_code || this.currency_code || 'USD';
        try {
            for (let i = 0; i < items.length; i++) {
                let itm = items.shift();
                if (validate.isEmty(itm.name || validate.isNotA.string(itm))) throw `items[${i}].name is emty or not a string`;
                if (validate.isNaN(itm.quantity) || validate.isNotA.num(itm.quantity)) throw `items[${i}].quantity is not a number or NaN`;
                if (validate.isNotA.object(itm.unit_amount) || validate.isArray(itm.unit_amount)) throw `items[${i}].unit_amount is not a object`;
                if (validate.isEmty(itm.unit_amount.currency_code) || validate.isNotA.string(itm.unit_amount.currency_code)) throw `items[${i}].unit_amount.currency_code is emty or not a string`;
                if (validate.isEmty(itm.unit_amount.value) || validate.isNotA.string(itm.unit_amount.value)) throw `items[${i}].unit_amount.value is emty or not a string`;
                items.push({
                    name: itm.name,
                    quantity: itm.quantity,
                    unit_amount: {
                        currency_code: itm.unit_amount.currency_code,
                        value: itm.unit_amount.value
                    }
                })
            }
        } catch (error) {
            throw ({
                paypalError: {
                    type: "Items_checking_error",
                    description: error
                }
            })
        }

        let response=await fetch(this.api_link +'/v2/checkout/orders' ,{
            method :'POST',
            headers: {
                "Cache-Control":"no-cache",
                'Content-Type': 'application/json',
                Authorization: `Bearer ${options.accessToken}`
            },
            body:JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    items: items,
                    amount: {
                        currency_code: currency_code,
                        value: options.total,
                        breakdown: {
                            item_total: {
                                currency_code: 'USD',
                                value: options.productToatal, // Cost of items
                            },
                            shipping: {
                                currency_code: 'USD',
                                value: options.shipping, // Shipping cost
                            }
                        }
                    }
                }],
                application_context: {
                    return_url:options.success_url || this.success_url,
                    cancel_url: options.cancel_url || this.cancel_url,
                    user_action: 'PAY_NOW',
                    brand_name:this.brand_name ? this.brand_name :undefined,
                }
            })
        });

        response=await response.json();
        if (response.links instanceof Array && response.id && response.status === 'CREATED' ) {
            let link=response.links.find(link => link.rel === 'approve');
            if (validate.isNotA.object(link)===false && link?.href) {
                return ({link :link.href,token :response.id});
            } 
        } else {
            throw ({
                paypalError:{
                    ...response
                }
            });
        }

    }

    async checkOutWithShipping(options ={currency_code,shipping , items: [{ name: '',  unit_amount: { currency_code: '', value: '0', }, quantity: '0' }] }) {
        
        let accessToken=await this.getAccessToken();

        let
            productTotal = 0,
            shipping = parseInt(options.shipping);

        if (validate.isNaN(shipping)) throw 'shipping is not a number';

        for (let i = 0; i < options.items.length; i++) {
            productTotal += parseInt(options.items[i]?.unit_amount?.value);
            if (validate.isNaN(productTotal)) throw 'items[i].unit_amount.value is not correct in the index '+i;
        }

        let link=await this.createPayment({
            accessToken :accessToken,
            items :options.items,
            total :MakePriceStringSync( productTotal +shipping ),
            productToatal :MakePriceStringSync(productTotal),
            shipping :MakePriceStringSync(shipping),
            currency_code :options.currency_code || 'USD',
            success_url :this.success_url,
            cancel_url :this.cancel_url
        });
        return link;
    }
}













export async function createPaypalPayment(
    {
        items,
        total,
        productToatal,
        shipping,
        success_url,
        cancell_url
    }     
    ) {   
    try {
        if (items instanceof Array === false) throw new Error("Items is not a array");
        for (let index = 0; index < items.length; index++) {
            const {name ,description ,quantity, unit_amount} =await items[index];
            if (!name ) throw new Error("Name is undefiened");
            if (!description ) throw new Error("Name is undefiened");
            if (!quantity ) throw new Error("Name is undefiened");
            if (typeof quantity !== 'number' || Number(quantity).toString==='NaN' ) throw new Error("quantity is not a number");            
            if (typeof unit_amount !== 'object') throw new Error("Unit amount is not a object"); 
            let {currency_code,value} =await unit_amount;
            if (!currency_code || !value) {
                log({currency_code,value});
                throw new Error("check currency_code,value"); 
            }
            if (currency_code !=='USD') throw new Error("currency_code is not USD"); 
            if (typeof value !== 'string') throw new Error("value is not string"); 
        }
        
       
        if (typeof total !== 'string' || Number(total).toString==='NaN' ) { log({total}); throw new Error("total  is not a corect");            }
        if (typeof productToatal !== 'string' || Number(productToatal).toString==='NaN' ) { log({productToatal}); throw new Error("productotal  is not a corect");            }
        if (typeof shipping !== 'number' || Number(shipping).toString==='NaN' ) { log({shipping}); throw new Error("shipping  is not a corect");            }
        // log(productToatal)


        /************************fetch request started****************************/
        let access_token =await generatePayPalToken()

        const response = await axios({
            url: PAYPAL_LINK + '/v2/checkout/orders',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access_token
            },
            data: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        items,
                        amount: {
                            currency_code: 'USD',
                            value: total,//'23.00',
                            breakdown: {
                                item_total: {
                                    currency_code: 'USD',
                                    value:productToatal
                                }
                            }
                        }
                    }
                ],
                application_context: {
                    return_url: BASE_URL + success_url,
                    cancel_url: BASE_URL + cancell_url,
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    brand_name: 'GojuShinRyu'
                }
            })
        }) ;
        // log(response.data)
        // log({pplink:response.data.links[1]});
        let link= response.data.links.find(link => link.rel === 'approve').href;
        return {success:true,link , paypal_id:response.data.id}
    } catch (error) {
        log(error);
        if (error.data) {
            log(error.data)
            log(error.data.links)
        }
        console.error('paypal error')
        return {error:'Failed make a payment '}
    }
}
export async function generatePayPalToken() {
    try {
        let response= await axios({
            url:PAYPAL_LINK +'/v1/oauth2/token',
            method:"POST",
            data: 'grant_type=client_credentials',
            auth:{
                username:T_PAYPAL_CLIENT_ID,
                password:T_PAYPAL_SECRET
            }
        });

        
     //   console.log(response.data);
        
        return response.data.access_token
    } catch (error) {
    //    console.error(error);
        log('token error')
        throw 'Token Failed To gain'
    }
  
}

