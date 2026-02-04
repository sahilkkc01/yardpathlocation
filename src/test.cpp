   #include <iostream>
    #include <vector>
    using namespace std;
    class Node{
    public:
        int data;
        Node* next;
       
    Node(int val){
        data=val;
        next=nullptr;
    }
    };
    
    //Node* means this will return a pointer of type Node
    Node* convertArrayToLL(vector<int> &arr){
        Node* head=new Node(arr[0]);
        Node* mover=head;
        for(int i=1;i<arr.size();i++){
            Node* temp = new Node(arr[i]);
            mover->next=temp;
            mover=temp;
        }
        return head;
    }
    Node* deleteAtTail(Node* head){
        if(head==nullptr) return nullptr;
        if(head->next==nullptr){
            free(head);
            return nullptr;
        }
        Node* temp = head;
        while(temp->next->next!=nullptr){
            temp=temp->next;
        }
        free(temp->next);
        temp->next=nullptr;
        return head;
    }
    Node* deleteAtHead(Node* head){
        if(head==nullptr) return head;
        Node* temp=head;
        head=temp->next;
        free(temp);
        return head;
    }
    //   O(k) time complexity
    Node* deleteAtK(Node* head,int k){
        if(head==nullptr) return nullptr;
        if(k==1){
            Node* temp = head;
            head=head->next;
            free(temp);
            return head;
        }
        int count =0;
        Node* prev=nullptr;
        Node* temp = head;
        while(temp!=nullptr){
            count++;
            if(count==k){
                prev->next=temp->next;
                free(temp);
                break;
            }
            prev=temp;
            temp=temp->next;
        }
        return head;
    }
Node* insertAtK(Node* head, int val, int k) {


    // Case 1: Insert in empty list
    if(head == nullptr) {
        if(k == 1) return new Node(val);
        return nullptr;
    }


    // Case 2: Insert at Head
    if(k == 1) {
        Node* temp = new Node(val);
        temp->next = head;
        return temp;
    }


    // Case 3: Insert in middle or end
    Node* temp = head;


    for(int i = 1; i < k - 1; i++) {
        if(temp == nullptr) return head; // Invalid position
        temp = temp->next;
    }


    Node* newNode = new Node(val);
    newNode->next = temp->next;
    temp->next = newNode;


    return head;
}


	
    int main() {
    vector<int> arr={1,2,3,4};
    Node* a=convertArrayToLL(arr);
    // deleteAtTail(a);
    // a=deleteAtHead(a);
    a = deleteAtK(a,2);
    while(a!=nullptr){
        cout<<a->data<<" ";
        a=a->next;
    }
   
   


        return 0;
    }

