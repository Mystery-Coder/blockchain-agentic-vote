// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AnonymousBallot
 * @notice A privacy-preserving voting contract that maintains two completely
 *         independent state mappings — one for tracking who has voted (by hash)
 *         and one for tallying votes per candidate. The separation, combined
 *         with off-chain Fisher-Yates shuffling of candidate IDs before
 *         submission, ensures no on-chain link between a voter's identity
 *         and their candidate choice.
 */
contract AnonymousBallot {
    // ──────────────────────────── Types ────────────────────────────

    enum ElectionState {
        NotStarted,
        Active,
        Ended
    }

    // ──────────────────────────── State ────────────────────────────

    address public immutable admin;
    address public immutable relayer;
    ElectionState public electionState;

    /// @dev Identity tracking — only stores whether a voterHash has been used
    mapping(bytes32 => bool) public hasVoted;

    /// @dev Vote tallies — only stores count per candidateId
    mapping(uint256 => uint256) public voteCount;

    /// @dev Registered candidate IDs (for validation)
    uint256[] public candidateIds;
    mapping(uint256 => bool) public isValidCandidate;

    uint256 public totalVotes;

    // ──────────────────────────── Events ───────────────────────────

    /// @notice Emitted when voters are marked — only count, NOT the hashes
    event VotersMarked(uint256 count);

    /// @notice Emitted when votes are recorded — only count, NOT the candidateIds
    event VotesRecorded(uint256 count);

    /// @notice Emitted when election state transitions
    event ElectionStateChanged(ElectionState newState);

    // ──────────────────────────── Errors ───────────────────────────

    error OnlyAdmin();
    error OnlyRelayer();
    error ElectionNotActive();
    error InvalidStateTransition();
    error VoterAlreadyVoted(bytes32 voterHash);
    error InvalidCandidate(uint256 candidateId);
    error EmptyBatch();
    error ArrayLengthMismatch();

    // ──────────────────────────── Modifiers ────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayer();
        _;
    }

    modifier onlyDuringElection() {
        if (electionState != ElectionState.Active) revert ElectionNotActive();
        _;
    }

    // ──────────────────────────── Constructor ──────────────────────

    /**
     * @param _relayer     Address of the relayer wallet (Hardhat account #0)
     * @param _candidateIds Array of valid candidate IDs for this election
     */
    constructor(address _relayer, uint256[] memory _candidateIds) {
        admin = msg.sender;
        relayer = _relayer;
        electionState = ElectionState.NotStarted;

        for (uint256 i = 0; i < _candidateIds.length; i++) {
            candidateIds.push(_candidateIds[i]);
            isValidCandidate[_candidateIds[i]] = true;
        }
    }

    // ──────────────────────────── Admin ────────────────────────────

    /**
     * @notice Advance election state: NotStarted → Active → Ended
     */
    function advanceElectionState() external onlyAdmin {
        if (electionState == ElectionState.NotStarted) {
            electionState = ElectionState.Active;
        } else if (electionState == ElectionState.Active) {
            electionState = ElectionState.Ended;
        } else {
            revert InvalidStateTransition();
        }
        emit ElectionStateChanged(electionState);
    }

    // ──────────────────────────── Batch Functions ─────────────────

    /**
     * @notice Mark an array of voterHashes as having voted.
     *         Reverts if ANY has already voted — atomic batch.
     * @param voterHashes Array of keccak256 hashes of voter identities
     */
    function markVoters(bytes32[] calldata voterHashes)
        external
        onlyRelayer
        onlyDuringElection
    {
        if (voterHashes.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < voterHashes.length; i++) {
            if (hasVoted[voterHashes[i]])
                revert VoterAlreadyVoted(voterHashes[i]);
            hasVoted[voterHashes[i]] = true;
        }

        emit VotersMarked(voterHashes.length);
    }

    /**
     * @notice Record votes for an array of candidateIds (already shuffled off-chain).
     *         Each entry increments the candidate's tally by 1.
     * @param _candidateIds Array of candidate IDs to record votes for
     */
    function recordVotes(uint256[] calldata _candidateIds)
        external
        onlyRelayer
        onlyDuringElection
    {
        if (_candidateIds.length == 0) revert EmptyBatch();

        for (uint256 i = 0; i < _candidateIds.length; i++) {
            if (!isValidCandidate[_candidateIds[i]])
                revert InvalidCandidate(_candidateIds[i]);
            voteCount[_candidateIds[i]]++;
        }

        totalVotes += _candidateIds.length;
        emit VotesRecorded(_candidateIds.length);
    }

    // ──────────────────────────── View Functions ──────────────────

    function hasVoterVoted(bytes32 voterHash) external view returns (bool) {
        return hasVoted[voterHash];
    }

    function getVoteCount(uint256 candidateId) external view returns (uint256) {
        return voteCount[candidateId];
    }

    function getTotalVotes() external view returns (uint256) {
        return totalVotes;
    }

    function getElectionState() external view returns (ElectionState) {
        return electionState;
    }

    function getCandidateIds() external view returns (uint256[] memory) {
        return candidateIds;
    }
}
