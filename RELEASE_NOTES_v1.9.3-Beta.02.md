**Sign-in limits, safer updates and fixes found by a second review**

### Fixed
- Failed sign-ins that arrive at the same moment are all counted: a burst of wrong passwords used to count as one, so the lockout never came.
- Changing your password, deleting an account and resetting the instance now stop after too many wrong passwords, per account, like the sign-in does.
- Renaming yourself works when you still have the default avatar; it was refused with an invalid-address error.
- Restoring a backup ends every session without touching the signing secret, so a session opened after the restore survives a restart. Restore errors are now translated, and an unreadable row makes a backup fail instead of leaving a gap in the file.
- Updates work in a directory of their own, only one can run at a time, a download is checked against the line of `checksums.txt` that names it, and one over the size limit is refused instead of cut short.
- Deleting a board is one change, its unused icons are swept, and a new board always goes after the last one. Reordering with a partial list no longer leaves two boards in the same position.
- Saving the monitoring settings is all or nothing, and a failure is reported instead of answering "saved".
- A password can be up to 256 characters, not 72 bytes, for sign-in and for setting one.
- The dashboard background is kept when a request does not mention it, and only an image address is accepted for it.
- Editing an account from the administration panel answers clearly when the account does not exist or the name is taken, and never changes the administrator's own password.
- With the server unreachable and nothing cached, the board is empty instead of showing a tile that is not yours.
- A preference that fails to save is rolled back everywhere, so the next save does not carry it.
- Only the administrator asks for updates, once per load.

### Changed
- Several Proxmox hosts are read at the same time instead of one after another.
- Answers from a Docker host and from the release server are read up to a size limit.
- The setup page applies the same avatar and accent rules as the profile.
