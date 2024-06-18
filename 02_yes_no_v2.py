# functions go here
def yes_no(question):

    while True:
        responce = input(question).lower()

        if responce == "yes" or responce == "y":
            return "yes"

        elif responce == "no" or responce == "n":
            return "no"

        else:
            print("PLease enter yes or no")


# main routine goes here
while True:
    want_instructions = yes_no("Do you want to read the instructions? ")

    if want_instructions == "yes":
        print("Instructions go here")

    print("program continues...")
    print()
