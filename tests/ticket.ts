import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Ticket } from "../target/types/ticket";
import { expect } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";

describe("ticket", () => {
	// Configure the client to use the local cluster.
	anchor.setProvider(anchor.AnchorProvider.env());
	let contestPDA: PublicKey;
	let contestBump: number;
	const contestName = "Test Contest";
	const contestDescription = "Test Contest Description";
	const ticketPrice = new BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
	const maxTickets = 5; // Nombre maximum de tickets

	const program = anchor.workspace.Ticket as Program<Ticket>;
	const provider = anchor.getProvider() as anchor.AnchorProvider;
	const payer = (provider.wallet as anchor.Wallet).payer;

	// Créer des participants pour les tests
	const participants: Keypair[] = [];
	for (let i = 0; i < maxTickets; i++) {
		participants.push(Keypair.generate());
		console.log(`Participant ${i}:`, participants[i].publicKey.toString());
	}

	// Fonction pour airdrop des SOL aux participants
	async function fundParticipant(participant: Keypair, amount: number = 10 * LAMPORTS_PER_SOL) {
		const balance = await provider.connection.getBalance(participant.publicKey);

		if (balance < amount) {
			const signature = await provider.connection.requestAirdrop(
				participant.publicKey,
				amount
			);
			await provider.connection.confirmTransaction(signature);
			console.log(`Funded participant with ${amount / LAMPORTS_PER_SOL} SOL`);
		}
	}

	// Variables pour les tests

	// Exécuter avant tous les tests
	before(async () => {
		// Calculer le PDA du concours
		const [pda, bump] = PublicKey.findProgramAddressSync(
			[Buffer.from("contest"), payer.publicKey.toBuffer()],
			program.programId
		);
		contestPDA = pda;
		contestBump = bump;

		// Financer tous les participants
		for (const participant of participants) {
			await fundParticipant(participant);
		}
	});

	it("Crée un concours avec succès", async () => {
		// Créer un concours
		const tx = await program.methods.createContest(
			contestName,
			contestDescription,
			ticketPrice,
			maxTickets
		).accounts({
			contest: contestPDA,
			signer: payer.publicKey,
			systemProgram: SystemProgram.programId,
		})
			.rpc();

		console.log("Transaction de création du concours:", tx);

		// Vérifier les données du concours
		const contestAccount = await program.account.contest.fetch(contestPDA);
		expect(contestAccount.name).to.equal(contestName);
		expect(contestAccount.description).to.equal(contestDescription);
		expect(contestAccount.ticketPrice.toString()).to.equal(ticketPrice.toString());
		expect(contestAccount.maxTickets).to.equal(maxTickets);
		expect(contestAccount.totalTicketsSold).to.equal(0);
		expect(contestAccount.winner).to.equal(null);
		expect(contestAccount.participant.length).to.equal(0);
		expect(contestAccount.bump).to.equal(contestBump);
		expect(contestAccount.owner.toString()).to.equal(payer.publicKey.toString());
	});

	it("Permet à un participant d'acheter un ticket", async () => {

		// Vérifier le solde initial du concours
		const contestBalanceBefore = await provider.connection.getBalance(contestPDA);

		// Acheter un ticket
		const tx = await program.methods.registerContest()
			.accounts({
				contest: contestPDA,
				signer: payer.publicKey,
			})
			.rpc();

		console.log("Transaction d'achat de ticket:", tx);

		// Vérifier les données du concours après l'achat
		const contestAccountAfter = await program.account.contest.fetch(contestPDA);
		const contestBalanceAfter = await provider.connection.getBalance(contestPDA);

		expect(contestAccountAfter.totalTicketsSold).to.equal(1);
		expect(contestAccountAfter.participant.length).to.equal(1);
		expect(contestBalanceAfter - contestBalanceBefore).to.equal(ticketPrice.toNumber());
		expect(contestAccountAfter.winner).to.equal(null); // Pas encore de gagnant
	});

	it("Permet à plusieurs participants d'acheter des tickets", async () => {
		// Utiliser le wallet principal comme participant pour simplifier
		// Cela évite les problèmes de signataires inconnus
		
		// Acheter plusieurs tickets avec le même wallet
		for (let i = 0; i < maxTickets - 2; i++) {
			console.log(`Utilisation du wallet ${i} comme participant:`, participants[i].publicKey.toString());
			const tx = await program.methods.registerContest()
				.accounts({
					contest: contestPDA,
					signer: participants[i].publicKey,
				})
				.signers([participants[i]])
				.rpc();

			console.log(`Transaction d'achat de ticket pour participant ${i}:`, tx);
		}
		// Vérifier les données du concours après les achats
		const contestAccount = await program.account.contest.fetch(contestPDA);
		console.log("Total tickets sold:", contestAccount.totalTicketsSold);
		console.log("Participant count:", contestAccount.participant.length);

		expect(contestAccount.totalTicketsSold).to.equal(maxTickets - 1);
		expect(contestAccount.participant.length).to.equal(maxTickets - 1);
		expect(contestAccount.winner).to.equal(null); // Pas encore de gagnant
	});

	it("Désigne un gagnant lorsque tous les tickets sont vendus", async () => {
		// Utiliser le wallet principal comme dernier participant
		const lastParticipant = participants[maxTickets - 1];
		console.log("Dernier participant (gagnant potentiel):", lastParticipant.publicKey.toString());

		const participantBalanceBefore = await provider.connection.getBalance(lastParticipant.publicKey);
		console.log("Solde avant l'achat du dernier ticket:", participantBalanceBefore / LAMPORTS_PER_SOL, "SOL");

		// Acheter le dernier ticket
		const tx = await program.methods.registerContest()
			.accounts({
				contest: contestPDA,
				signer: lastParticipant.publicKey,
			})
			.signers([lastParticipant])
			.rpc();

		console.log("Transaction du dernier ticket:", tx);

		// Vérifier les données du concours après le dernier achat
		const contestAccount = await program.account.contest.fetch(contestPDA);
		const participantBalanceAfter = await provider.connection.getBalance(lastParticipant.publicKey);

		expect(contestAccount.totalTicketsSold).to.equal(maxTickets);
		expect(contestAccount.participant.length).to.equal(maxTickets);
		expect(contestAccount.winner).to.not.equal(null);
		expect(contestAccount.winner.toString()).to.equal(lastParticipant.publicKey.toString());

		// Vérifier que le gagnant a reçu les fonds (moins le coût du ticket)
		const expectedGain = ticketPrice.toNumber() * (maxTickets); // Tous les tickets sauf le sien
		const actualGain = participantBalanceAfter - participantBalanceBefore + ticketPrice.toNumber();
		expect(actualGain).to.be.approximately(expectedGain, 10000); // Tolérance pour les frais
	});

	it("Empêche l'achat de tickets une fois la limite atteinte", async () => {
		// Utiliser le wallet principal pour tenter d'acheter un ticket supplémentaire
		console.log("Tentative d'achat avec le wallet principal après limite atteinte:", payer.publicKey.toString());

		// Vérifier que le concours a bien atteint sa limite de tickets
		const contestAccount = await program.account.contest.fetch(contestPDA);
		console.log(`État du concours avant tentative: ${contestAccount.totalTicketsSold}/${contestAccount.maxTickets} tickets vendus, gagnant: ${contestAccount.winner ? contestAccount.winner.toString() : 'non'}`);

		try {
			await program.methods.registerContest()
				.accounts({
					contest: contestPDA,
					signer: payer.publicKey,
				})
				.rpc();

			// Si on arrive ici, c'est que l'achat a réussi, ce qui est une erreur
			expect.fail("L'achat de ticket aurait dû échouer car la limite est atteinte");
		} catch (error) {
			// Vérifier que l'erreur est bien celle attendue
			console.log("Erreur attendue reçue:", error.message);
			expect(error.message).to.include("TicketLimitReached");
		}
	});

	it("Crée un nouveau concours avec des paramètres différents", async () => {
		// Créer un nouveau PDA pour un nouveau concours
		const newContestName = "Second Contest";
		const newContestDescription = "Another contest for testing";
		const newTicketPrice = new BN(0.2 * LAMPORTS_PER_SOL); // 0.2 SOL
		const newMaxTickets = 3;

		// Utiliser le wallet principal pour créer le concours
		const newOwner = payer;
		console.log("Création d'un nouveau concours avec le wallet principal:", newOwner.publicKey.toString());

		// Créer un nouveau PDA pour le nouveau concours
		// Nous utilisons un seed différent pour obtenir un PDA différent
		const [newContestPDA, newBump] = PublicKey.findProgramAddressSync(
			[Buffer.from("contest2"), newOwner.publicKey.toBuffer()],
			program.programId
		);
		console.log("Nouveau PDA de concours:", newContestPDA.toString());

		// Créer le nouveau concours
		const tx = await program.methods.createContest(
			newContestName,
			newContestDescription,
			newTicketPrice,
			newMaxTickets)
			.accounts({
				contest: newContestPDA,
				signer: newOwner.publicKey,
				systemProgram: SystemProgram.programId,
			})
			.rpc();

		console.log("Transaction de création du nouveau concours:", tx);

		// Vérifier les données du nouveau concours
		const newContestAccount = await program.account.contest.fetch(newContestPDA);
		expect(newContestAccount.name).to.equal(newContestName);
		expect(newContestAccount.description).to.equal(newContestDescription);
		expect(newContestAccount.ticketPrice.toString()).to.equal(newTicketPrice.toString());
		expect(newContestAccount.maxTickets).to.equal(newMaxTickets);
		expect(newContestAccount.owner.toString()).to.equal(newOwner.publicKey.toString());
	});
});
