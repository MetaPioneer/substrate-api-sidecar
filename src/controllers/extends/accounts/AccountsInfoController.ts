import { ApiPromise } from '@polkadot/api';
import { Keyring, encodeAddress } from '@polkadot/keyring';
import { PHRASE } from '../../../types/util/Constants';
import { checkAddress } from '@polkadot/util-crypto';
import { IPostRequestHandler, IPassword , ITransferParam, IAddressParam } from 'src/types/requests';

import { validateAddress } from '../../../middleware';
import { AccountsInfoService } from '../../../services/extends';
import AbstractController from '../../AbstractController';


/**
 * POST password to create a new address.
 *
 * Post info:
 * - `data`: Expects a string, e.g. '{"password": "123456"}'.
 * - `headers`: Expects 'Content-Type: application/json'.
 *
 * Returns:
 * - Success:
 *   - `hash`: The address.
 * - Failure:

 */
export default class AccountsInfoController extends AbstractController<
	AccountsInfoService
> {
	constructor(api: ApiPromise) {
		super(api, '/account', new AccountsInfoService(api));
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.router.use(this.path, validateAddress);

		this.safeMountAsyncPostHandlers([
			['/createAddress', this.createNewAddress],
			['/transfer', this.transfer],
			['/checkAddress', this.checkAddress],
		]);
	}

	/**
	 * Submit a serialized transaction to the transaction queue.
	 *
	 * @param req Sidecar TxRequest
	 * @param res Express Response
	 */
	private createNewAddress: IPostRequestHandler<IPassword> = async (
		{ body: { password } },
		res
	): Promise<void> => {
		if (!password) {
			throw {
				error: 'Missing field `password` on request body.',
			};
		}

		const { ss58Format } = await this.api.rpc.system.properties();

		const keyring = new Keyring({ type: 'sr25519' });

		const account = keyring.addFromUri(`${PHRASE}///` + password);

		const address = encodeAddress(account.address, Number(ss58Format));

		res.send({'address': address});
	};

	private transfer: IPostRequestHandler<ITransferParam> = async (
		{ body: { secretPhrase, recipient, amount } },
		res
	): Promise<void> => {
		if (!secretPhrase) {
			throw {
				error: 'Missing field `secretPhrase` on request body.',
			};
		}
		if (!recipient) {
			throw {
				error: 'Missing field `recipient` on request body.',
			};
		}
		if (!amount) {
			throw {
				error: 'Missing field `amount` on request body.',
			};
		}

		const keyring = new Keyring({ type: 'sr25519' });
		const account = keyring.addFromUri(`${PHRASE}///` + secretPhrase);

		// Get the nonce for the admin key
		const { nonce } = await this.api.query.system.account(account.address);

		// Get current block
		const signedBlock = await this.api.rpc.chain.getBlock();

		// Get current block height and hash
		const blockHash = signedBlock.block.header.hash;

		try {
			const txHash = await this.api.tx.balances
			.transfer(recipient, amount)
			.signAndSend(account, { blockHash, nonce });
			res.send({'hash': txHash});
		} catch (error) {
			res.send({'code': '500', 'msg': error});
		}

	};

	private checkAddress: IPostRequestHandler<IAddressParam> = async (
		{ body: { address } },
		res
	): Promise<void> => {
		if (!address) {
			throw {
				error: 'Missing field `address` on request body.',
			};
		}

		const { ss58Format } = await this.api.rpc.system.properties();

		const [isValid, error] = checkAddress(address, Number(ss58Format))
		if (!isValid && error) {
			res.send({'code': '-1', 'msg': error});
		}else{
			res.send({'code': 200});
		}

	};
}
