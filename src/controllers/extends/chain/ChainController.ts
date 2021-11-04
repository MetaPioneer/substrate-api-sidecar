import { ApiPromise } from '@polkadot/api';
import { RequestHandler } from 'express';

import { ChainService } from '../../../services/extends';
import AbstractController from '../../AbstractController';


export default class ChainController extends AbstractController<
	ChainService
> {
	constructor(api: ApiPromise) {
		super(api, '/chain', new ChainService(api));
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.safeMountAsyncGetHandlers([
            ['/getBlockNumber', this.getLatestBlock],
			['/getFinalizedBlockNum', this.getFinalizedBlockNum],
		]);
    }
    
    /**
	 * Get the latest block.
	 *
	 * @param _req Express Request
	 * @param res Express Response
	 */
	private getLatestBlock: RequestHandler = async (_req, res) => {

		const { number } = await this.api.rpc.chain.getHeader();

		res.send({'height': number});
	};

	private getFinalizedBlockNum: RequestHandler = async (_req, res) => {

		const hash = await this.api.rpc.chain.getFinalizedHead();
		const { number } = await this.api.rpc.chain.getHeader(hash);

		res.send({'height': number});
	};
	

}
