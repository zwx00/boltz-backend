import Exchange, { makeRequest } from '../Exchange';

class Bittrex implements Exchange {
  private static readonly API = 'https://api.bittrex.com/v3';

  public getPrice = async (baseAsset: string, quoteAsset: string): Promise<number> => {
    const response = await makeRequest(`${Bittrex.API}/markets/${baseAsset}-${quoteAsset}/ticker`);
    return Number(response.lastTradeRate);
  }
}

export default Bittrex;
